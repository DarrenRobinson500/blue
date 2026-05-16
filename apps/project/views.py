from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Project, Task
from .serializers import ProjectSerializer, TaskSerializer


@api_view(['GET', 'POST'])
def project_list(request):
    if request.method == 'GET':
        return Response(ProjectSerializer(Project.objects.all(), many=True).data)
    s = ProjectSerializer(data=request.data)
    if s.is_valid():
        s.save()
        return Response(s.data, status=status.HTTP_201_CREATED)
    return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def project_reorder(request):
    for position, project_id in enumerate(request.data):
        Project.objects.filter(pk=project_id).update(order=position)
    return Response({'status': 'ok'})


@api_view(['GET', 'PUT', 'DELETE'])
def project_detail(request, pk):
    try:
        project = Project.objects.get(pk=pk)
    except Project.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(ProjectSerializer(project).data)
    if request.method == 'PUT':
        s = ProjectSerializer(project, data=request.data)
        if s.is_valid():
            s.save()
            return Response(s.data)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
    project.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
def task_list(request):
    if request.method == 'GET':
        project_id = request.query_params.get('project')
        qs = Task.objects.filter(project_id=project_id) if project_id else Task.objects.all()
        return Response(TaskSerializer(qs.order_by('order', 'id'), many=True).data)
    s = TaskSerializer(data=request.data)
    if s.is_valid():
        s.save()
        return Response(s.data, status=status.HTTP_201_CREATED)
    return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def task_detail(request, pk):
    try:
        task = Task.objects.get(pk=pk)
    except Task.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(TaskSerializer(task).data)
    if request.method == 'PUT':
        s = TaskSerializer(task, data=request.data)
        if s.is_valid():
            s.save()
            return Response(s.data)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
    task.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
def task_done(request, pk):
    try:
        task = Task.objects.get(pk=pk)
    except Task.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    task.completed = not task.completed
    task.save()
    return Response(TaskSerializer(task).data)


@api_view(['POST'])
def task_reorder(request):
    for position, task_id in enumerate(request.data):
        Task.objects.filter(pk=task_id).update(order=position)
    return Response({'status': 'ok'})


@api_view(['POST'])
def task_bulk_update(request):
    for item in request.data:
        Task.objects.filter(pk=item['id']).update(
            start_date=item['start_date'],
            end_date=item['end_date'],
        )
    return Response({'status': 'ok'})
