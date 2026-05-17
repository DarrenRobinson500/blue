from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError('Username is required')
        if not extra_fields.get('email'):
            extra_fields['email'] = self.normalize_email(f'{username}@lifeplatform.internal')
        else:
            extra_fields['email'] = self.normalize_email(extra_fields['email'])
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(username, password, **extra_fields)


class Function(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='children',
        db_column='parent_id',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'core_function'
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.code})'


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        CRO = 'cro', 'CRO'
        CHIEF_ACTUARY = 'chief_actuary', 'Chief Actuary'
        ADMIN = 'admin', 'Admin'

    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.ADMIN)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    function = models.ForeignKey(
        'core.Function',
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name='current_users',
        db_column='function_id',
    )

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = 'core_user'

    def __str__(self):
        return self.email


class PlatformSettings(models.Model):
    email_domain = models.CharField(max_length=255, default='lifeplatform.internal')

    class Meta:
        db_table = 'core_platform_settings'

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class ProvisionedUser(models.Model):
    username = models.CharField(max_length=150, unique=True)
    function = models.ForeignKey(
        'core.Function',
        on_delete=models.PROTECT,
        related_name='provisioned_users',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'core_provisioned_user'
        ordering = ['username']

    def __str__(self):
        return self.username


class FunctionAppAccess(models.Model):
    APPS = [
        ('risk', 'Risk'),
        ('project', 'Project'),
        ('actuarial', 'Actuarial'),
        ('admin', 'Admin'),
    ]
    function = models.ForeignKey(Function, on_delete=models.CASCADE, related_name='app_access')
    app = models.CharField(max_length=50, choices=APPS)

    class Meta:
        db_table = 'core_function_app_access'
        unique_together = ('function', 'app')

    def __str__(self):
        return f'{self.function.code} → {self.app}'


class UserFunctionHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='function_history')
    function = models.ForeignKey(Function, on_delete=models.PROTECT, related_name='assignment_history')
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    assigned_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='function_assignments_made',
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'core_user_function_history'
        ordering = ['-start_date']

    def __str__(self):
        return f'{self.user.email} → {self.function.code} from {self.start_date}'
