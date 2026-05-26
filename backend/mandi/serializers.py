from rest_framework import serializers
from .models import Mandi, MandiArrival


class MandiSerializer(serializers.ModelSerializer):
    """
    Serializer for mandi master list — used for dropdowns and admin filtering.
    """

    class Meta:
        model = Mandi
        fields = ['id', 'name', 'district', 'state', 'is_active']


class MandiArrivalSerializer(serializers.ModelSerializer):
    """
    Full CRUD serializer for mandi arrival entries.
    `submitted_by` is auto-set from the request user.
    """
    mandi_name = serializers.CharField(source='mandi.name', read_only=True)
    mandi_state = serializers.CharField(source='mandi.state', read_only=True)

    class Meta:
        model = MandiArrival
        fields = [
            'id', 'mandi', 'mandi_name', 'mandi_state',
            'commodity', 'date', 'arrival_quantity',
            'avg_rate', 'min_rate', 'max_rate',
            'source', 'remark', 'created_at', 'local_id'
        ]
        read_only_fields = ['id', 'created_at']
