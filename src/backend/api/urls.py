# api/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from api import views


router = DefaultRouter()
router.register('riders', views.RiderViewSet)
router.register('daily-forms', views.DailyFormViewSet)
router.register('final-forms', views.FinalFormViewSet)
router.register('daily-form-skills', views.DailyFormSkillViewSet)
router.register('final-form-skills', views.FinalFormSkillViewSet)
router.register('caregivers', views.CaregiverViewSet)
router.register('sessions', views.SessionViewSet)
router.register('skills', views.SkillViewSet)
router.register('bikes', views.BikeViewSet)
router.register('bikespecs', views.BikeSpecsViewSet)
router.register('leaders', views.LeaderViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('me/', views.MeView.as_view(), name='me'),
    path('stats/general/', views.GeneralStatsView.as_view(), name='general-stats'),
    path('data/view/', views.ExportAnonymousData.as_view(), name='data-view'),
    path("users/", views.UserManagementView.as_view(), name="users-view"),
    path(
        "accounts/<uuid:id>/role/",
        views.UpdateRoleView.as_view(),
        name="update-role",
    ),
]
