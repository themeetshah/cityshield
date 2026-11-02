from django.urls import path

from . import views

urlpatterns = [
    # Facilities (read)
    path('police-stations/', views.list_police_stations, name='list_police_stations'),
    path('police-stations/<int:station_id>/', views.get_police_station, name='get_police_station'),
    path('hospitals/', views.list_hospitals, name='list_hospitals'),
    path('hospitals/<int:hospital_id>/', views.get_hospital, name='get_hospital'),
    path('nearby-facilities/', views.nearby_facilities, name='nearby_facilities'),
    path('nearby-police/', views.nearby_police_stations, name='nearby_police'),
    path('nearby-hospitals/', views.nearby_hospitals, name='nearby_hospitals'),

    # Heuristic risk analysis (read)
    path('risk-grid/', views.risk_grid, name='risk_grid'),
    path('risk-zones/', views.risk_zones, name='risk_zones'),
    path('risk-analysis/', views.analyze_area_risk, name='analyze_area_risk'),

    # Safety zones (read: authenticated, write: superadmin)
    path('safety-zones/', views.list_safety_zones, name='list_safety_zones'),
    path('safety-zones/<int:zone_id>/', views.get_safety_zone, name='get_safety_zone'),
    path('create-safety-zone/', views.create_safety_zone, name='create_safety_zone'),
    path('update-safety-zone/<int:zone_id>/', views.update_safety_zone, name='update_safety_zone'),
    path('delete-safety-zone/<int:zone_id>/', views.delete_safety_zone, name='delete_safety_zone'),

    # Data management (superadmin)
    path('import-police-csv/', views.import_police_csv, name='import_police_csv'),
    path('import-hospitals-csv/', views.import_hospitals_csv, name='import_hospitals_csv'),
    path('export-facilities/', views.export_facilities, name='export_facilities'),
    path('sync-facilities/', views.sync_facilities_from_overpass, name='sync_facilities'),
]
