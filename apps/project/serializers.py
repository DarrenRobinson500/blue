from rest_framework import serializers
from .models import Project, Task, TodoItem


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'name', 'active', 'order']


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            'id', 'project', 'name', 'description',
            'start_date', 'end_date', 'order',
            'depends_on', 'completed', 'is_heading',
        ]


class TodoItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = TodoItem
        fields = ['id', 'title', 'completed', 'parent', 'order', 'created_at']
