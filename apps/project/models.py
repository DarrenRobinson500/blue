from django.db import models


class Project(models.Model):
    name = models.CharField(max_length=255)
    active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Task(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    depends_on = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL, related_name='dependents'
    )
    completed = models.BooleanField(default=False)
    is_heading = models.BooleanField(default=False)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.name} ({self.project.name})"


class TodoItem(models.Model):
    title = models.CharField(max_length=500)
    completed = models.BooleanField(default=False)
    parent = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.CASCADE, related_name='children'
    )
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'project_todo'
        ordering = ['order', 'id']

    def __str__(self):
        return self.title
