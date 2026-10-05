-- Lets the community change log record a deleted community (a moderator removing a community
-- created by mistake). Applied by `npm run db:migrate`.

alter table public.community_info_log drop constraint community_info_log_action_check;
alter table public.community_info_log add constraint community_info_log_action_check check (action in (
  'add_source', 'remove_source', 'add_contact', 'remove_contact', 'reverify_source', 'reverify_contact',
  'delete_community'
));
