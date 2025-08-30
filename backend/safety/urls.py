from django.urls import path
from . import views

urlpatterns = [
    # Facility Management
    path('police-stations/', views.list_police_stations, name='list_police_stations'),
    path('police-stations/<int:station_id>/', views.get_police_station, name='get_police_station'),
    path('hospitals/', views.list_hospitals, name='list_hospitals'),
    path('hospitals/<int:hospital_id>/', views.get_hospital, name='get_hospital'),
    path('safety-zones/', views.list_safety_zones, name='list_safety_zones'),
    path('safety-zones/<int:zone_id>/', views.get_safety_zone, name='get_safety_zone'),
    
    # Location-based Services (moved from reports app)
    path('nearby-facilities/', views.nearby_facilities, name='nearby_facilities'),
    path('nearby-police/', views.nearby_police_stations, name='nearby_police'),
    path('nearby-hospitals/', views.nearby_hospitals, name='nearby_hospitals'),
    
    # Safety Analysis (moved from reports app)
    path('predict-safety-zones/', views.predict_safety_zones, name='predict_safety_zones'),
    path('chloropleth-data/', views.get_chloropleth_data, name='get_chloropleth_data'),
    path('enhanced-chloropleth-data/', views.get_chloropleth_data, name='get_enhanced_chloropleth_data'),
    path('risk-analysis/', views.analyze_area_risk, name='analyze_area_risk'),
    
    # Data Import/Export
    path('import-police-csv/', views.import_police_csv, name='import_police_csv'),
    path('import-hospitals-csv/', views.import_hospitals_csv, name='import_hospitals_csv'),
    path('csv-statistics/', views.csv_statistics, name='csv_statistics'),
    path('export-facilities/', views.export_facilities, name='export_facilities'),
    
    # Overpass API Integration
    path('fetch-overpass-data/', views.fetch_overpass_data, name='fetch_overpass_data'),
    path('sync-facilities/', views.sync_facilities_from_overpass, name='sync_facilities'),
    
    # Safety Zone Management
    path('create-safety-zone/', views.create_safety_zone, name='create_safety_zone'),
    path('update-safety-zone/<int:zone_id>/', views.update_safety_zone, name='update_safety_zone'),
    path('delete-safety-zone/<int:zone_id>/', views.delete_safety_zone, name='delete_safety_zone'),

    path('safety-map-reports/', views.safety_map_reports, name='safety_map_reports'),
    path('nearby-reports/', views.nearby_reports, name='nearby_reports'),
]
