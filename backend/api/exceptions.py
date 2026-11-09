from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.db.models import ProtectedError
from django.db import IntegrityError


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if isinstance(exc, ProtectedError):
        return Response(
            {
                'detail': 'امکان حذف این مورد وجود ندارد زیرا موجودیت‌ها یا سوابق دیگری در سیستم به آن وابسته‌اند.'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if isinstance(exc, IntegrityError) and response is None:
        err_msg = str(exc).lower()
        if 'unique constraint' in err_msg or 'duplicate key' in err_msg:
            return Response(
                {'detail': 'اطلاعات واردشده تکراری است و قبلاً در سامانه ثبت گردیده است.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return Response(
            {'detail': 'خطای وابستگی یا یکپارچگی در پایگاه داده رخ داده است.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    return response
