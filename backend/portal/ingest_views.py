from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from data_engine.ingestion_service import RawIngestionService
import json

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def ingest_data(request):
    """
    Handles file upload or manual JSON paste ingestion.
    Expects:
    - source_type: "SAP" | "UTILITY" | "TRAVEL"
    - file: Optional. The actual CSV or JSON file (for multipart uploads)
    - raw_payload: Optional. Standard JSON array or stringified JSON array (for manual pasting)
    """
    source_type = request.data.get('source_type')
    file_obj = request.FILES.get('file')
    raw_payload_data = request.data.get('raw_payload')
    
    if not source_type:
        return Response({'error': 'Source type is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
    if not file_obj and not raw_payload_data:
        return Response({'error': 'Either file upload or raw_payload must be provided.'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        # Check if user has a membership
        if not hasattr(request.user, 'membership'):
            return Response({'error': 'User not associated with any organization.'}, status=status.HTTP_403_FORBIDDEN)

        if file_obj:
            master, summary = RawIngestionService.process_file_upload(
                request.user, 
                source_type, 
                file_obj
            )
        else:
            # Parse raw payload if stringified
            if isinstance(raw_payload_data, str):
                try:
                    payload = json.loads(raw_payload_data)
                except json.JSONDecodeError:
                    return Response({'error': 'Invalid JSON format in raw_payload.'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                payload = raw_payload_data

            if not isinstance(payload, list):
                payload = [payload]

            master, summary = RawIngestionService.process_raw_payload(
                user=request.user,
                source_type=source_type,
                raw_payload=payload,
                filename="manual_paste.json",
                is_demo=False
            )
            
        return Response({
            'status': 'success', 
            'ingestion_id': master.id,
            'processed': summary['processed'],
            'success_count': summary['success'],
            'flagged_count': summary['flagged'],
            'failed_count': summary['failed']
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
