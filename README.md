# Daymark — Personal Planner

A responsive, local-first daily planner and monthly activity tracker.

## Run locally

Requirements: Node.js 20+ and npm.

1. Extract this folder.
2. Open a terminal inside the `daymark` folder.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open the local address printed by Vite (usually http://localhost:5173).

To create a production build, run `npm run build`.

## Data and privacy

- Daily pages, monthly check-ins, and templates are saved in browser IndexedDB on this device/profile.
- No application backend, login, or hosted database is configured.
- Use Settings → Download backup regularly. The JSON backup can be restored from Settings.
- Clearing browser/site data or losing the browser profile can remove local data. A backup is the recovery path.
- Date headings use the computer's local date; date navigation uses real calendar dates.

## Included

- Daily pages with task, time, completion checkbox, remarks, extra work, pending work, and daily notes.
- Daily history and search.
- Monthly targets with one checkbox per occurrence and date/remark details.
- Monthly activity editing for the selected month or across existing/future months.
- Responsive light interface and JSON backup/restore.
