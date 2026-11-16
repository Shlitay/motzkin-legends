-- Score feed: Turkey's API-Football name is "Türkiye", not "Turkey"
-- (added 2026-11-16). start-season-2.sql mapped טורקיה by the name
-- "Turkey" with no team ID, so France–Turkey (15.11) never matched and was
-- entered by hand. Pin the API team ID (777), which the feed checks before
-- the name. Safe to re-run.

update team_api_ids
set api_team_id = 777, api_name = 'Türkiye'
where team_name = 'טורקיה';

select team_name, api_team_id, api_name from team_api_ids where team_name = 'טורקיה';
