"""
v1 imported `police_station_data.csv` into PoliceStation, but that file is the
India Post office directory (BO/SO/HO offices), not police stations. Showing
post offices as police stations is fabricated data, so those rows are removed.
Police users linked to them get police_station = NULL (FK is SET_NULL) and must
be re-assigned to a real station by their admin.
Real stations remain (OpenStreetMap `amenity=police` rows, source='overpass*').
"""
from django.db import migrations


def forwards(apps, schema_editor):
    PoliceStation = apps.get_model('safety', 'PoliceStation')
    User = apps.get_model('users', 'User')
    postal = PoliceStation.objects.filter(source__in=['csv', 'csv_import'])
    User.objects.filter(police_station__in=postal).update(police_station=None)
    postal.delete()


class Migration(migrations.Migration):
    dependencies = [
        ('safety', '0002_alter_hospital_options_alter_policestation_options'),
        ('users', '0014_normalize_roles'),
    ]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
