import re
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import ValidationError

from workflow.models import (
    Workflow,
    FormDefinition,
    FormSection,
    FormField,
    FormRepeatableGroup,
    FormPrintSettings,
    StaticChoiceSet,
    LookupList,
    RepeatableRow,
    RepeatableRowValue,
    FieldAccess,
    RepeatableGroupAccess,
    FormPrintFieldSettings,
)
from api.serializers import (
    FormDefinitionSerializer,
    FormSectionSerializer,
    FormFieldSerializer,
    FormRepeatableGroupSerializer,
    FormPrintSettingsSerializer,
)


class FormDefinitionDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, workflow_id):
        wf = get_object_or_404(Workflow, pk=workflow_id)
        form_def, _ = FormDefinition.objects.get_or_create(
            workflow=wf,
            defaults={'name': f'فرم {wf.name}'}
        )
        # Ensure default section exists
        if not form_def.sections.exists():
            FormSection.objects.create(
                form=form_def,
                name='مشخصات عمومی',
                code='general_info',
                order=1
            )
        # Ensure print settings exist
        if not hasattr(form_def, 'print_settings'):
            FormPrintSettings.objects.get_or_create(
                form=form_def,
                defaults={'document_title': f'فرم چاپی {wf.name}'}
            )

        serializer = FormDefinitionSerializer(form_def)
        return Response(serializer.data)

    def patch(self, request, workflow_id):
        wf = get_object_or_404(Workflow, pk=workflow_id)
        form_def = get_object_or_404(FormDefinition, workflow=wf)
        name = request.data.get('name')
        if name:
            form_def.name = name.strip()
        if 'is_active' in request.data:
            form_def.is_active = request.data['is_active']
        form_def.save()
        return Response(FormDefinitionSerializer(form_def).data)


class FormSectionListCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, workflow_id):
        wf = get_object_or_404(Workflow, pk=workflow_id)
        form_def, _ = FormDefinition.objects.get_or_create(
            workflow=wf,
            defaults={'name': f'فرم {wf.name}'}
        )
        name = request.data.get('name', '').strip()
        code = request.data.get('code', '').strip()
        description = request.data.get('description', '').strip()

        if not name:
            return Response({'name': ['نام بخش الزامی است.']}, status=status.HTTP_400_BAD_REQUEST)
        if not code:
            count = form_def.sections.count() + 1
            code = f"sec_{count}"

        max_order = form_def.sections.order_by('-order').values_list('order', flat=True).first() or 0
        section = FormSection.objects.create(
            form=form_def,
            name=name,
            code=code,
            description=description,
            order=max_order + 1
        )
        return Response(FormSectionSerializer(section).data, status=status.HTTP_201_CREATED)


class FormSectionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = FormSection.objects.all().prefetch_related('fields', 'repeatable_groups')
    serializer_class = FormSectionSerializer
    permission_classes = [AllowAny]
    lookup_url_kwarg = 'section_id'

    def perform_destroy(self, instance):
        if RepeatableRowValue.objects.filter(field__section=instance).exists():
            raise ValidationError({
                'detail': 'امکان حذف این بخش به دلیل وجود اطلاعات ثبت‌شده در پرونده‌های جاری وجود ندارد.'
            })

        with transaction.atomic():
            # 1. Unlink choice parents pointing to fields in this section
            FormField.objects.filter(choice_parent_field__section=instance).update(choice_parent_field=None)
            # 2. Unlink choice parents and repeatable groups inside this section
            instance.fields.all().update(choice_parent_field=None, repeatable_group=None)
            # 3. Delete field access permissions
            FieldAccess.objects.filter(field__section=instance).delete()
            # 4. Delete print settings for fields
            FormPrintFieldSettings.objects.filter(field__section=instance).delete()
            # 5. Delete fields
            instance.fields.all().delete()

            # 6. Delete repeatable groups
            for group in instance.repeatable_groups.all():
                group.child_groups.all().update(parent_group=None)
            RepeatableGroupAccess.objects.filter(group__section=instance).delete()
            FormPrintFieldSettings.objects.filter(repeatable_group__section=instance).delete()
            instance.repeatable_groups.all().delete()

            # 7. Print settings for section
            if hasattr(instance, 'print_settings'):
                instance.print_settings.delete()

            # 8. Delete section
            instance.delete()


class FormFieldCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, workflow_id):
        wf = get_object_or_404(Workflow, pk=workflow_id)
        form_def, _ = FormDefinition.objects.get_or_create(
            workflow=wf,
            defaults={'name': f'فرم {wf.name}'}
        )

        section_id = request.data.get('section')
        if section_id:
            section = get_object_or_404(FormSection, pk=section_id, form=form_def)
        else:
            section = form_def.sections.first()
            if not section:
                section = FormSection.objects.create(
                    form=form_def,
                    name='مشخصات عمومی',
                    code='general_info',
                    order=1
                )

        repeatable_group_id = request.data.get('repeatable_group')
        repeatable_group = None
        if repeatable_group_id:
            repeatable_group = get_object_or_404(FormRepeatableGroup, pk=repeatable_group_id, section=section)

        name = request.data.get('name', '').strip()
        label = request.data.get('label', name).strip()
        code = request.data.get('code', '').strip()
        if not code:
            total_fields = section.fields.count() + 1
            code = f"field_{total_fields}"

        field_type = request.data.get('field_type', FormField.FieldType.TEXT)
        calendar = request.data.get('calendar', FormField.Calendar.JALALI)
        choice_source = request.data.get('choice_source', FormField.ChoiceSource.NONE)
        choice_static_set_id = request.data.get('choice_static_set')
        choice_lookup_list_id = request.data.get('choice_lookup_list')
        choice_parent_field_id = request.data.get('choice_parent_field')
        system_key = request.data.get('system_key', FormField.SystemKey.NONE)
        help_text = request.data.get('help_text', '').strip()
        default_value = request.data.get('default_value', '').strip()
        is_required = request.data.get('is_required', False)
        show_in_process_summary = request.data.get('show_in_process_summary', False)
        decimal_places = int(request.data.get('decimal_places', 2))
        is_active = request.data.get('is_active', True)
        choices = request.data.get('choices', [])

        max_order = section.fields.order_by('-order').values_list('order', flat=True).first() or 0

        field = FormField.objects.create(
            section=section,
            repeatable_group=repeatable_group,
            name=name,
            code=code,
            label=label,
            field_type=field_type,
            calendar=calendar,
            choice_source=choice_source,
            choice_static_set_id=choice_static_set_id if choice_source == 'STATIC' else None,
            choice_lookup_list_id=choice_lookup_list_id if choice_source == 'LOOKUP' else None,
            choice_parent_field_id=choice_parent_field_id if choice_parent_field_id else None,
            system_key=system_key,
            help_text=help_text,
            default_value=default_value,
            is_required=is_required,
            show_in_process_summary=show_in_process_summary,
            decimal_places=decimal_places,
            is_active=is_active,
            choices=choices,
            order=max_order + 1
        )

        return Response(FormFieldSerializer(field).data, status=status.HTTP_201_CREATED)


class FormFieldDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = FormField.objects.all().select_related('section', 'repeatable_group', 'choice_static_set', 'choice_lookup_list', 'choice_parent_field')
    serializer_class = FormFieldSerializer
    permission_classes = [AllowAny]
    lookup_url_kwarg = 'field_id'

    def perform_destroy(self, instance):
        if RepeatableRowValue.objects.filter(field=instance).exists():
            raise ValidationError({
                'detail': 'امکان حذف این فیلد به دلیل وجود اطلاعات ثبت‌شده در پرونده‌ها وجود ندارد.'
            })

        with transaction.atomic():
            # Unlink child choices
            instance.dependent_choice_fields.all().update(choice_parent_field=None)
            # Delete access permissions
            instance.access_rules.all().delete()
            # Delete print settings
            instance.print_settings.all().delete()
            # Delete field
            instance.delete()


class FormRepeatableGroupCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, workflow_id):
        wf = get_object_or_404(Workflow, pk=workflow_id)
        form_def, _ = FormDefinition.objects.get_or_create(
            workflow=wf,
            defaults={'name': f'فرم {wf.name}'}
        )

        section_id = request.data.get('section')
        if section_id:
            section = get_object_or_404(FormSection, pk=section_id, form=form_def)
        else:
            section = form_def.sections.first()
            if not section:
                section = FormSection.objects.create(
                    form=form_def,
                    name='مشخصات عمومی',
                    code='general_info',
                    order=1
                )

        name = request.data.get('name', '').strip()
        label = request.data.get('label', name).strip()
        code = request.data.get('code', '').strip()
        if not code:
            code = f"group_{section.repeatable_groups.count() + 1}"

        group_type = request.data.get('group_type', FormRepeatableGroup.GroupType.NORMAL)
        display_type = request.data.get('display_type', FormRepeatableGroup.DisplayType.TABLE)
        description = request.data.get('description', '').strip()
        is_required = request.data.get('is_required', False)

        max_order = section.repeatable_groups.order_by('-order').values_list('order', flat=True).first() or 0

        group = FormRepeatableGroup.objects.create(
            section=section,
            name=name,
            code=code,
            label=label,
            group_type=group_type,
            display_type=display_type,
            description=description,
            is_required=is_required,
            order=max_order + 1
        )

        return Response(FormRepeatableGroupSerializer(group).data, status=status.HTTP_201_CREATED)


class FormRepeatableGroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = FormRepeatableGroup.objects.all().prefetch_related('fields')
    serializer_class = FormRepeatableGroupSerializer
    permission_classes = [AllowAny]
    lookup_url_kwarg = 'group_id'

    def perform_destroy(self, instance):
        if RepeatableRow.objects.filter(group=instance).exists():
            raise ValidationError({
                'detail': 'امکان حذف این گروه تکرارشونده به دلیل وجود سطرهای اطلاعاتی در پرونده‌ها وجود ندارد.'
            })

        with transaction.atomic():
            instance.child_groups.all().update(parent_group=None)
            for field in instance.fields.all():
                field.dependent_choice_fields.all().update(choice_parent_field=None)
                field.access_rules.all().delete()
                field.print_settings.all().delete()
                field.delete()
            instance.access_rules.all().delete()
            instance.print_settings.all().delete()
            instance.delete()


class FormPrintSettingsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, workflow_id):
        wf = get_object_or_404(Workflow, pk=workflow_id)
        form_def, _ = FormDefinition.objects.get_or_create(
            workflow=wf,
            defaults={'name': f'فرم {wf.name}'}
        )
        settings, _ = FormPrintSettings.objects.get_or_create(
            form=form_def,
            defaults={'document_title': f'فرم چاپی {wf.name}'}
        )
        return Response(FormPrintSettingsSerializer(settings).data)

    def patch(self, request, workflow_id):
        wf = get_object_or_404(Workflow, pk=workflow_id)
        form_def, _ = FormDefinition.objects.get_or_create(workflow=wf)
        settings, _ = FormPrintSettings.objects.get_or_create(
            form=form_def,
            defaults={'document_title': f'فرم چاپی {wf.name}'}
        )
        serializer = FormPrintSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Update field-level print settings if provided
        field_settings = request.data.get('field_settings')
        if isinstance(field_settings, list):
            for item in field_settings:
                f_id = item.get('field_id')
                if f_id:
                    field = FormField.objects.filter(pk=f_id, section__form=form_def).first()
                    if field:
                        FormPrintFieldSettings.objects.update_or_create(
                            field=field,
                            defaults={
                                'is_enabled': item.get('is_enabled', True),
                                'title_override': item.get('title_override', ''),
                                'print_order': item.get('print_order', field.order or 0),
                            }
                        )
                        print_width = item.get('print_width')
                        if print_width:
                            c = field.choices if isinstance(field.choices, dict) else {}
                            c['print_width'] = print_width
                            field.choices = c
                            field.save(update_fields=['choices'])

                g_id = item.get('group_id')
                if g_id:
                    grp = FormRepeatableGroup.objects.filter(pk=g_id, section__form=form_def).first()
                    if grp:
                        FormPrintFieldSettings.objects.update_or_create(
                            repeatable_group=grp,
                            defaults={
                                'is_enabled': item.get('is_enabled', True),
                                'title_override': item.get('title_override', ''),
                                'print_order': item.get('print_order', grp.order or 0),
                                'group_layout': item.get('group_layout', 'TABLE'),
                            }
                        )

        return Response(serializer.data)
