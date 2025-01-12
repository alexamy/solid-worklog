# Solid Worklog
Opinionated time management application for monitoring time spent on tasks and tracking total time spent.

### https://alexamy.github.io/solid-worklog/

## Core functionality
- Task entries with auto-calculated duration (start/end timestamps)
- Task tagging + descriptions (with special *idle* tag)
- Tag autocomplete
- Editable entries table
- Automatic formatting of [Jira](https://www.atlassian.com/software/jira) issue links
- Time aggregation by tags with period filtering
- Automatic app state sync to localStorage
- State import/export via JSON file

## Inspired by
- [Toggl Track](https://toggl.com/)
- [Marinara Pomodoro](https://chromewebstore.google.com/detail/marinara-pomodoro%C2%AE-assist/lojgmehidjdhhbmpjfamhpkpodfcodef)

## Local development
```bash
$ npm install
$ npm run dev
# open http://localhost:5173/solid-worklog/
```

## Solid 🥰
Learn more on the [Solid Website](https://docs.solidjs.com/quick-start) and come chat on [Discord](https://discord.com/invite/solidjs).

## Available scripts
In the project directory, you can run:

### `npm run dev`

Runs the app in the development mode.<br>
Open [http://localhost:5173/solid-worklog/](http://localhost:5173/solid-worklog/) to view it in the browser.

### `npm run build`

Builds the app for production to the `dist` folder.<br>
It correctly bundles Solid in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
The app is ready to be deployed!
