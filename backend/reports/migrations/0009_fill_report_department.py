from django.db import migrations

# Frozen copy of users.roles.REPORT_TYPE_DEPARTMENT at the time of this migration.
REPORT_TYPE_DEPARTMENT = {
    'crime': 'police',
    'harassment': 'police',
    'safety': 'police',
    'infrastructure': 'municipal',
    'fire_hazard': 'fire',
    'medical': 'medical',
    'other': 'municipal',
}


def fill_department(apps, schema_editor):
    Report = apps.get_model('reports', 'Report')
    for report_type, department in REPORT_TYPE_DEPARTMENT.items():
        Report.objects.filter(report_type=report_type).update(department=department)


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0008_report_department_report_is_anonymous_and_more'),
    ]

    operations = [
        migrations.RunPython(fill_department, migrations.RunPython.noop),
    ]
