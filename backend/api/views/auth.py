from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

User = get_user_model()


def serialize_user(user):
    job_info = None
    if getattr(user, 'job', None):
        job_info = {
            'id': user.job.id,
            'name': user.job.name,
        }

    display_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.username
    display_role = 'مدیر ارشد سامانه' if user.is_superuser else (user.job.name if getattr(user, 'job', None) else ('کارشناس سیستم' if user.is_staff else 'کاربر اپراتور'))

    return {
        'id': user.id,
        'username': user.username,
        'first_name': user.first_name or '',
        'last_name': user.last_name or '',
        'display_name': display_name,
        'display_role': display_role,
        'email': user.email or '',
        'is_superuser': user.is_superuser,
        'is_staff': user.is_staff,
        'job': job_info,
    }


class AuthLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not username:
            return Response({'error': 'لطفاً نام کاربری را وارد نمایید.'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=username, password=password)
        if user is None:
            # Check if user exists to provide clean feedback
            if not User.objects.filter(username=username).exists():
                return Response({'error': f'کاربری با نام «{username}» در سامانه یافت نشد.'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'error': 'کلمه عبور وارد شده نادرست است.'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.is_active:
            return Response({'error': 'حساب کاربری شما غیرفعال شده است. لطفاً با راهبر تماس بگیرید.'}, status=status.HTTP_403_FORBIDDEN)

        django_login(request, user)
        return Response({
            'success': True,
            'user': serialize_user(user),
            'message': f'خوش آمدید، {user.get_full_name() or user.username}',
        })


class AuthQuickLoginView(APIView):
    """Allows rapid persona switching for testing/switching operators on port 5174."""
    permission_classes = [AllowAny]

    def post(self, request):
        user_id = request.data.get('user_id')
        username = request.data.get('username')

        user = None
        if user_id:
            user = User.objects.filter(id=user_id, is_active=True).first()
        elif username:
            user = User.objects.filter(username=username, is_active=True).first()

        if not user:
            return Response({'error': 'کاربر مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        django_login(request, user)
        return Response({
            'success': True,
            'user': serialize_user(user),
            'message': f'ورود موفق با هویت {user.get_full_name() or user.username}',
        })


class AuthLogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        django_logout(request)
        return Response({'success': True, 'message': 'با موفقیت خارج شدید.'})


class AuthMeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            return Response({
                'authenticated': True,
                'user': serialize_user(request.user),
            })
        return Response({'authenticated': False, 'user': None})
