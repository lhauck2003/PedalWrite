# api/serializers.py
from rest_framework import serializers
import hashlib

from api.models import (
    Caregiver,
    DailyForm,
    DailyFormSkill,
    FinalForm,
    FinalFormSkill,
    Rider,
    Session,
    Skill,
    Bike,
    BikeSpecs,
    Account, 
    Leader
)

class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ('id', 'sessionnumber', 'starttime', 'endtime')


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ('id', 'skillname', 'formlevel', 'category')


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = (
            'id',
            'firebase_uid',
            'role',
            'username',
            'email',
            'leader',
            'caregiver',
        )
        read_only_fields = ('firebase_uid',)

class CaregiverSerializer(serializers.ModelSerializer):
    riders = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset= Rider.objects.all(), 
        required=False
    )
    class Meta:
        model = Caregiver
        fields = ('id', 'firstname', 'lastname', 'email', 'phone', 'isemergencycontact', 'riders')


class RiderSerializer(serializers.ModelSerializer):
    leader_name = serializers.CharField(source='leader.name', read_only=True)
    session_number = serializers.IntegerField(source='session.sessionnumber', read_only=True)
    caregivers = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset= Caregiver.objects.all(), 
        required=False
    )
    
    class Meta:
        model = Rider
        fields = (
            'id',
            'firstname',
            'lastname',
            'isquickstart',
            'session',
            'session_number',
            'leader',
            'leader_name',
            'caregivers',
        )

    def update(self, instance, validated_data):
        caregivers = validated_data.pop("caregivers", None)

        # Update normal Rider fields
        instance = super().update(instance, validated_data)

        # Update caregiver relationships if provided
        if caregivers is not None:
            instance.caregivers.set(caregivers)

        return instance




class DailyFormSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source='skill.skillname', read_only=True)

    class Meta:
        model = DailyFormSkill
        fields = ('id', 'skill', 'skill_name', 'level', 'comments')


class FinalFormSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source='skill.skillname', read_only=True)

    class Meta:
        model = FinalFormSkill
        fields = ('id', 'skill', 'skill_name', 'level', 'comments')


class DailyFormSerializer(serializers.ModelSerializer):
    leader_name = serializers.SerializerMethodField()
    session_number = serializers.IntegerField(source='session.sessionnumber', read_only=True)

    # WRITE field (input)
    skill_links = DailyFormSkillSerializer(many=True, required=False)

    class Meta:
        model = DailyForm
        fields = (
            'id',
            'date',
            'rider',
            'session',
            'session_number',
            'leader',
            'leader_name',
            'comments',
            'level',
            'skill_links',
        )

    def get_leader_name(self, obj):
        leader = obj.leader or getattr(obj.rider, 'leader', None)
        return leader.name if leader else None

    def create(self, validated_data):
        skills_data = validated_data.pop('skill_links', [])

        form = DailyForm.objects.create(**validated_data)

        for item in skills_data:
            DailyFormSkill.objects.create(
                dailyform=form,
                **item
            )

        return form

    def update(self, instance, validated_data):
        skills_data = validated_data.pop("skill_links", [])

        instance = super().update(instance, validated_data)

        instance.skill_links.all().delete()

        for item in skills_data:
            DailyFormSkill.objects.create(
                dailyform=instance,
                **item
            )

        return instance


class FinalFormSerializer(serializers.ModelSerializer):
    leader_name = serializers.SerializerMethodField()
    session_number = serializers.IntegerField(source='session.sessionnumber', read_only=True)

    # WRITE field (input)
    skill_links = FinalFormSkillSerializer(many=True, required=False)

    class Meta:
        model = FinalForm
        fields = (
            'id',
            'date',
            'rider',
            'session',
            'session_number',
            'leader',
            'leader_name',
            'comments',
            'level',
            'skill_links',
        )

    def get_leader_name(self, obj):
        leader = obj.leader or getattr(obj.rider, 'leader', None)
        return leader.name if leader else None

    def create(self, validated_data):
        skills_data = validated_data.pop('skill_links', [])

        form = FinalForm.objects.create(**validated_data)

        for item in skills_data:
            FinalFormSkill.objects.create(
                finalform=form,
                **item
            )

        return form

    def update(self, instance, validated_data):
        skills_data = validated_data.pop("skill_links", [])

        instance = super().update(instance, validated_data)

        instance.skill_links.all().delete()

        for item in skills_data:
            FinalFormSkill.objects.create(
                finalform=instance,
                **item
            )

        return instance
    

class AnonymousDailyFormSerializer(serializers.ModelSerializer):
    skill_ids = serializers.PrimaryKeyRelatedField(
        source='skill_links', many=True, read_only=True
    )
    rider_token = serializers.SerializerMethodField()

    class Meta:
        model = DailyForm
        fields = ['id', 'date', 'level', 'skill_ids', 'rider_token']

    def get_rider_token(self, obj):
        if not obj.rider_id:
            return None
        return hashlib.sha256(str(obj.rider_id).encode()).hexdigest()[:16]

class AnonymousFinalFormSerializer(serializers.ModelSerializer):
    skill_ids = serializers.PrimaryKeyRelatedField(
        source='skill_links', many=True, read_only=True
    )
    rider_token = serializers.SerializerMethodField()

    class Meta:
        model = FinalForm
        fields = ['id', 'date', 'level', 'skill_ids', 'rider_token']
        
    def get_rider_token(self, obj):
        if not obj.rider_id:
            return None
        return hashlib.sha256(str(obj.rider_id).encode()).hexdigest()[:16]


class BikeSerializer(serializers.ModelSerializer):
    riders = RiderSerializer(many=True, required=False)
    class Meta:
        model = Bike
        fields = [
            'id',
            'size',
            'name',
            'riders'
        ]

class BikeSpecsSerializer(serializers.ModelSerializer):
    class Meta:
        model = BikeSpecs
        fields = [
            'id',
            'bike',
            'rider',
            'day',
            'seat_height',
            'left_piston',
            'right_piston',
        ]

class LeaderSerializer(serializers.ModelSerializer):
    name = serializers.CharField(read_only=True)
    riders = RiderSerializer(many=True, required=False, read_only=True)

    class Meta:
        model = Leader
        fields = ('id', 'firstname', 'lastname', 'email', 'name', 'riders')