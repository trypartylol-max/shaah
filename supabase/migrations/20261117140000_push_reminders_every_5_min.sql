-- Reminders were checked every 15 minutes; a reminder could arrive up to 15 minutes late. Now every 5. Applied 2026-11-17.
select cron.alter_job(job_id:=(select jobid from cron.job where jobname='shaah-push-reminders'), schedule:='*/5 * * * *');
