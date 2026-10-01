from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from apps.ai.services import process_user_query, execute_mutation_action

class AIQueryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        query_text = request.data.get('query', '').strip()
        if not query_text:
            return Response({"error": "Query parameter is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = process_user_query(request.user, query_text)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AIExecuteMutationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        action_name = request.data.get('action')
        params = request.data.get('params', {})

        if not action_name:
            return Response({"error": "Action is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = execute_mutation_action(request.user, action_name, params)
            return Response(result, status=status.HTTP_200_OK)
        except ValueError as ve:
            return Response({"error": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
