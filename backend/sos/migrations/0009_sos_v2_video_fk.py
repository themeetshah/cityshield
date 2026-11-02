import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sos', '0008_sos_v2_data'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='sosvideofeed',
            name='emergency_id',
        ),
        migrations.AlterField(
            model_name='sosvideofeed',
            name='sos_alert',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='video_feeds',
                                    to='sos.sosalert'),
        ),
        migrations.AlterUniqueTogether(
            name='sosvideofeed',
            unique_together={('sos_alert', 'chunk_sequence')},
        ),
    ]
