from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import Function, User, UserFunctionHistory, ProvisionedUser, PlatformSettings


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        username_input = data['username'].strip().lower()
        try:
            user_obj = User.objects.get(username__iexact=username_input)
        except User.DoesNotExist:
            raise serializers.ValidationError('Invalid credentials.')
        user = authenticate(username=user_obj.username, password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid credentials.')
        if not user.is_active:
            raise serializers.ValidationError('Account is inactive.')
        data['user'] = user
        return data


class FunctionBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Function
        fields = ('id', 'name', 'code')


class UserSerializer(serializers.ModelSerializer):
    function = FunctionBriefSerializer(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'role', 'function')


# ── Function serialisers ──────────────────────────────────────────────────────

class FunctionListSerializer(serializers.ModelSerializer):
    current_user_count = serializers.SerializerMethodField()
    parent = FunctionBriefSerializer(read_only=True)

    class Meta:
        model = Function
        fields = ('id', 'name', 'code', 'description', 'is_active', 'current_user_count', 'created_at', 'parent')

    def get_current_user_count(self, obj):
        return obj.current_users.count()


class FunctionCurrentUserSerializer(serializers.ModelSerializer):
    assigned_since = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'assigned_since')

    def get_assigned_since(self, user):
        record = user.function_history.filter(end_date__isnull=True).first()
        return record.start_date if record else None


class FunctionAssignmentHistorySerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    assigned_by_email = serializers.SerializerMethodField()

    class Meta:
        model = UserFunctionHistory
        fields = ('user_email', 'start_date', 'end_date', 'assigned_by_email', 'notes')

    def get_assigned_by_email(self, obj):
        return obj.assigned_by.email if obj.assigned_by else None


class FunctionDetailSerializer(FunctionListSerializer):
    current_users = FunctionCurrentUserSerializer(many=True, read_only=True)
    assignment_history = FunctionAssignmentHistorySerializer(many=True, read_only=True)
    children = FunctionBriefSerializer(many=True, read_only=True)

    class Meta(FunctionListSerializer.Meta):
        fields = FunctionListSerializer.Meta.fields + ('current_users', 'assignment_history', 'children')


class FunctionWriteSerializer(serializers.ModelSerializer):
    parent_id = serializers.PrimaryKeyRelatedField(
        source='parent',
        queryset=Function.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Function
        fields = ('name', 'code', 'description', 'is_active', 'parent_id')

    def validate_code(self, value):
        if self.instance is not None:
            raise serializers.ValidationError('Function code cannot be changed after creation.')
        return value.upper()

    def validate_parent_id(self, value):
        if value and self.instance and value.id == self.instance.id:
            raise serializers.ValidationError('A function cannot be its own parent.')
        return value


# ── User serialisers ──────────────────────────────────────────────────────────

class UserFunctionHistorySerializer(serializers.ModelSerializer):
    function_name = serializers.CharField(source='function.name', read_only=True)
    function_code = serializers.CharField(source='function.code', read_only=True)
    assigned_by_email = serializers.SerializerMethodField()

    class Meta:
        model = UserFunctionHistory
        fields = ('function_name', 'function_code', 'start_date', 'end_date', 'assigned_by_email', 'notes')

    def get_assigned_by_email(self, obj):
        return obj.assigned_by.email if obj.assigned_by else None


class PlatformSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSettings
        fields = ('email_domain',)


class ProvisionedUserSerializer(serializers.ModelSerializer):
    function = FunctionBriefSerializer(read_only=True)
    function_id = serializers.PrimaryKeyRelatedField(
        queryset=Function.objects.filter(is_active=True),
        source='function',
        write_only=True,
    )

    class Meta:
        model = ProvisionedUser
        fields = ('id', 'username', 'function', 'function_id', 'created_at')

    def validate_username(self, value):
        return value.strip().lower()


class UserListSerializer(serializers.ModelSerializer):
    function = FunctionBriefSerializer(read_only=True)
    function_assigned_since = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'role', 'is_active', 'function', 'function_assigned_since')

    def get_function_assigned_since(self, user):
        if not user.function_id:
            return None
        record = user.function_history.filter(end_date__isnull=True).first()
        return record.start_date if record else None


class UserDetailSerializer(UserListSerializer):
    function_history = UserFunctionHistorySerializer(many=True, read_only=True)

    class Meta(UserListSerializer.Meta):
        fields = UserListSerializer.Meta.fields + ('function_history',)


class AssignFunctionSerializer(serializers.Serializer):
    function_id = serializers.IntegerField()
    start_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_function_id(self, value):
        try:
            fn = Function.objects.get(pk=value)
        except Function.DoesNotExist:
            raise serializers.ValidationError('Function not found.')
        if not fn.is_active:
            raise serializers.ValidationError('Cannot assign an inactive function.')
        return value
