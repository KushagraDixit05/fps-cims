import logging
from rest_framework import serializers
from .models import Mandi, MandiArrival

logger = logging.getLogger('fps.custom_values')


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
            'source', 'custom_source', 'remark', 'created_at', 'local_id'
        ]
        read_only_fields = ['id', 'created_at']

    def validate_custom_source(self, value: str) -> str:
        return value.strip()[:100]

    def validate(self, attrs):
        if attrs.get('source') == 'other' and not attrs.get('custom_source', '').strip():
            raise serializers.ValidationError(
                {'custom_source': 'Required when source is "Other".'}
            )
        return attrs

    def create(self, validated_data):
        validated_data['submitted_by'] = self.context['request'].user
        instance = super().create(validated_data)
        if instance.source == 'other' and instance.custom_source:
            logger.info(
                'custom_value_submitted',
                extra={
                    'user_id': self.context['request'].user.id,
                    'module': 'mandi_arrival',
                    'field': 'source',
                    'value': instance.custom_source,
                },
            )
        return instance
