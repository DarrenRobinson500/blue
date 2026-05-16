from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(email, password, **extra_fields)


class Function(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
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

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = 'core_user'

    def __str__(self):
        return self.email


class UserFunctionHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='function_history')
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
