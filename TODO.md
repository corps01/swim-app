# TODO

- [x] Structured schedule schema (`03-schedules.sql`) and agenda RPC
- [x] Create class UI for recurring rules (days + session times + timezone)
- [x] Edit class schedule (`InstructorEditClassPage` + `update_class_with_schedule`)
- [x] Transactional create/update class + schedule RPCs (`04-class-schedule-rpcs.sql`)
- [x] Class session detail route (`/instructor/classes/:id`) with in-memory attendance
- [x] Progress photo / diary (`05-progress-logs.sql`, dedicated log screen, parent activity feed)
- [x] Parent cheer on activity cards (`06-progress-cheers.sql`)
- [ ] Per-class pool timezone picker on create/edit class
- [ ] Dedicated waiver/form table (agenda uses `cir.status <> active` as interim alert signal)

## Client agenda requirements (meeting notes)

| Requirement | Status | Notes |
|---------------|--------|--------|
| Chronological by session time | Met | RPC + UI sort; swimmers inherit session order |
| Shift brackets (AM/PM/eve) | Met | Heuristic groups in `instructorAgendaLayout.ts` |
| Location per bracket | Met | Sub-groups under each shift |
| Days, time, duration, season, pool/lane | Met | Weekdays, times, and pool on cards; season range from schedule rules |
| Inline form/health alerts | Partial | Medical flag + pending enrollment; no separate waiver doc yet |
| Daily progress photo prompt | Met | Banner opens today’s first session deck for logging |
| Tap session → deck mode | Met | `/instructor/classes/:id` with attendance + progress log |

# Post-MVP Enhancements

- Multi-photo attachments per log.
- Auto-advance to next student during deck-side logging.
- Offline upload queueing for poor poolside reception.
