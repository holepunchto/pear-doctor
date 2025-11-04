import os from 'os'
import { isLinux } from 'which-runtime'

export const sections = [
  {
    title: 'Cold-start',
    tooltip:
      'These checks ensure the app cold-starts correctly. The app should be closed before running each check.',
    items: [
      {
        id: 'COLD_START_LINK',
        text: 'Cold-start link click - link opens app',
        tooltip:
          'Make sure this app is closed. Then, open the app by clicking the link: [app-key]',
        activeFromLength: 0
      },
      {
        id: 'COLD_START_FRAGMENT',
        text: 'Fragment - link click loads fragment',
        tooltip:
          'Make sure this app is closed. Then, open the app by clicking the link: [app-key]/#fragment',
        activeFromLength: 0
      },
      {
        id: 'COLD_START_QUERY',
        text: 'Query - link click loads query',
        tooltip:
          'Make sure this app is closed. Then, open the app by clicking the link: [app-key]/?query',
        activeFromLength: 0
      },
      {
        id: 'COLD_START_ENTRYPOINT',
        text: 'Entrypoint - link click loads entrypoint',
        tooltip:
          'Make sure this app is closed. Then, open the app by clicking the link: [app-key]/nested/entrypoint.html',
        activeFromLength: 0
      },
      {
        id: 'COLD_START_ENTRYPOINT_FRAGMENT',
        text: 'Entrypoint fragment - link click loads entrypoint with fragment',
        tooltip:
          'Make sure this app is closed. Then, open the app by clicking the link: [app-key]/nested/entrypoint.html#fragment',
        activeFromLength: 0
      },
      {
        id: 'COLD_START_ENTRYPOINT_QUERY',
        text: 'Entrypoint query - link click loads entrypoint with query',
        tooltip:
          'Make sure this app is closed. Then, open the app by clicking the link: [app-key]/nested/entrypoint.html?query',
        activeFromLength: 0
      }
    ]
  },
  {
    title: 'Wake-up',
    tooltip:
      'These checks ensure the app wakes up correctly. The app should be open while running these checks.',
    items: [
      {
        id: 'WAKE_UP_LINK',
        text: 'Wake-up link click - link click while app is open',
        tooltip:
          'Make sure this app is already open. Then, click the link: [app-key]>',
        activeFromLength: 0
      },
      {
        id: 'WAKE_UP_LINK_FROM_INSIDE_APP',
        text: 'Wake-up link click - link click from inside the app',
        tooltip: 'Make sure this app is already open. Then, click the button.',
        link: '[app-key]/?source=inside-app',
        activeFromLength: 0
      },
      {
        id: 'WAKE_UP_FRAGMENT',
        text: 'Fragment - link click loads fragment while app is open',
        tooltip:
          'Make sure this app is already open. Then, click the link: [app-key]/#fragment',
        tooltipInactive:
          "This check is disabled pending a platform update with <a href='https://github.com/holepunchto/pear/pull/222'>PR 222 - Include fragment to wakeup message</a>",
        activeFromLength: 0
      },
      {
        id: 'WAKE_UP_QUERY',
        text: 'Query - link click loads query while app is open',
        tooltip:
          'Make sure this app is already open. Then, click the link: [app-key]/?query',
        activeFromLength: 0
      },
      {
        id: 'WAKE_UP_ENTRYPOINT',
        text: 'Entrypoint - link click loads entrypoint',
        tooltip:
          'Make sure this app is already open. Then, click the link: [app-key]/nested/entrypoint.html',
        tooltipInactive:
          "This check is disabled pending a platform update with <a href='https://github.com/holepunchto/pear/pull/222'>PR 222 - Include fragment to wakeup message</a>",
        activeFromLength: 0
      },
      {
        id: 'WAKE_UP_ENTRYPOINT_FRAGMENT',
        text: 'Entrypoint Fragment - link click loads entrypoint with fragment',
        tooltip:
          'Make sure this app is already open. Then, click the link: [app-key]/nested/entrypoint.html#fragment',
        tooltipInactive:
          "This check is disabled pending a platform update with <a href='https://github.com/holepunchto/pear/pull/222'>PR 222 - Include fragment to wakeup message</a>",
        activeFromLength: 0
      },
      {
        id: 'WAKE_UP_ENTRYPOINT_QUERY',
        text: 'Entrypoint Query - link click loads entrypoint with query',
        tooltip:
          'Make sure this app is already open. Then, click the link: [app-key]/nested/entrypoint.html?query',
        activeFromLength: 0
      }
    ]
  },
  ...(isLinux
    ? []
    : [
        {
          title: 'Media',
          tooltip:
            'These checks ensure the system media access is working correctly. Click on the buttons to perform the checks.',
          items: [
            {
              id: 'MEDIA_MICROPHONE_STATUS',
              text: 'Microphone - status',
              tooltip: 'Click to get the microphone status.',
              button: 'action-button',
              action: 'Status',
              type: 'Microphone',
              activeFromLength: 0
            },
            {
              id: 'MEDIA_CAMERA_STATUS',
              text: 'Camera - status',
              tooltip: 'Click to get the camera status.',
              button: 'action-button',
              action: 'Status',
              type: 'Camera',
              activeFromLength: 0
            },
            {
              id: 'MEDIA_SCREEN_STATUS',
              text: 'Screen - status',
              tooltip: 'Click to get the screen status.',
              button: 'action-button',
              action: 'Status',
              type: 'Screen',
              activeFromLength: 0
            },
            {
              id: 'MEDIA_MICROPHONE_ACCESS',
              text: 'Microphone - access',
              tooltip:
                os.platform() === 'darwin'
                  ? 'Grant microphone permission to your terminal app in MacOS Settings. Click to ask for microphone access.'
                  : 'Click to ask for microphone access.',
              button: 'action-button',
              action: 'Access',
              type: 'Microphone',
              activeFromLength: 0
            },
            {
              id: 'MEDIA_CAMERA_ACCESS',
              text: 'Camera - access',
              tooltip:
                os.platform() === 'darwin'
                  ? 'Grant camera permission to your terminal app in MacOS Settings. Click to ask for camera access.'
                  : 'Click to ask for camera access.',
              button: 'action-button',
              action: 'Access',
              type: 'Camera',
              activeFromLength: 0
            },
            {
              id: 'MEDIA_SCREEN_ACCESS',
              text: 'Screen - access',
              tooltip:
                os.platform() === 'darwin'
                  ? 'Grant screen permission to your terminal app in MacOS Settings. Click to ask for screen access.'
                  : 'Click to ask for screen access.',
              button: 'action-button',
              action: 'Access',
              type: 'Screen',
              activeFromLength: 0
            }
          ]
        }
      ]),
  {
    title: 'Lifecycle',
    tooltip: 'Lifecycle checks.',
    items: [
      {
        id: 'LIFECYCLE_DHT_NODES',
        text: 'DHT nodes',
        tooltip: 'Check if the DHT configuration is set.',
        button: 'action-button',
        action: 'Check',
        type: 'DHT-Nodes',
        activeFromLength: 0
      },
      {
        id: 'LIFECYCLE_TEARDOWN_NORMAL',
        text: 'Teardown - normal exit (less than 15s)',
        tooltip:
          'Click the action, the app should close within 1 second. A green check should appear when you reopen the app to confirm the teardown.',
        button: 'action-button',
        action: 'Check',
        type: 'Teardown-Normal',
        activeFromLength: 0
      },
      {
        id: 'LIFECYCLE_TEARDOWN_REJECT',
        text: 'Teardown - reject exit (less than 15s)',
        tooltip:
          'Click the action, the app should close. A green check should appear when you reopen the app to confirm the teardown.',
        button: 'action-button',
        action: 'Check',
        type: 'Teardown-Reject',
        activeFromLength: 0
      },
      {
        id: 'LIFECYCLE_TEARDOWN_FORCE',
        text: 'Teardown - force exit (timeout in 15s)',
        tooltip: 'Click the action, the app should close within 15 seconds.',
        button: 'action-button',
        action: 'Check',
        type: 'Teardown-Force',
        activeFromLength: 0
      },
      {
        id: 'LIFECYCLE_RESTART_PLATFORM',
        text: 'Restart - platform',
        tooltip: 'Click the action, the app should restart.',
        button: 'action-button',
        action: 'Restart',
        type: 'Restart-Platform',
        buttonSecond: 'action-button',
        actionSecond: 'Check',
        typeSecond: 'Restart-Platform',
        activeFromLength: 0
      },
      {
        id: 'LIFECYCLE_RESTART_CLIENT',
        text: 'Restart - client',
        tooltip: 'Click the action, the app should restart.',
        button: 'action-button',
        action: 'Restart',
        type: 'Restart-Client',
        buttonSecond: 'action-button',
        actionSecond: 'Check',
        typeSecond: 'Restart-Client',
        activeFromLength: 0
      }
    ]
  },
  {
    title: 'Worker',
    tooltip: 'Worker checks.',
    items: [
      {
        id: 'WORKER_SUBPROCESS',
        text: 'Worker subprocess',
        tooltip: 'Check if the worker subprocess runs with unrouted config.',
        button: 'action-button',
        action: 'Check',
        type: 'Worker-Subprocess',
        activeFromLength: 0
      },
      {
        id: 'WORKER_PARENT_END',
        text: 'Worker exit - on parent end',
        tooltip: 'Check if the worker exits when the parent ends.',
        button: 'action-button',
        action: 'Check',
        type: 'Worker-Parent-End',
        activeFromLength: 0
      },
      {
        id: 'WORKER_PARENT_DESTROY',
        text: 'Worker exit - on parent destroy',
        tooltip: 'Check if the worker exits when the parent destroys.',
        button: 'action-button',
        action: 'Check',
        type: 'Worker-Parent-Destroy',
        activeFromLength: 0
      },
      {
        id: 'WORKER_CHILD_END',
        text: 'Worker exit - on child end',
        tooltip: 'Check if the worker exits when the child ends.',
        button: 'action-button',
        action: 'Check',
        type: 'Worker-Child-End',
        activeFromLength: 0
      },
      {
        id: 'WORKER_CHILD_DESTROY',
        text: 'Worker exit - on child destroy',
        tooltip: 'Check if the worker exits when the child destroys.',
        button: 'action-button',
        action: 'Check',
        type: 'Worker-Child-Destroy',
        activeFromLength: 0
      },
      {
        id: 'WORKER_PARENT_CLOSE',
        text: 'Worker exit - on parent close',
        tooltip:
          'Click the close action to run the worker and exit the app. Reopen the app and click the check button to check if previous worker has exited.',
        button: 'action-button',
        action: 'Close',
        type: 'Worker-Parent-Close',
        buttonSecond: 'action-button',
        actionSecond: 'Check',
        typeSecond: 'Worker-Parent-Close',
        activeFromLength: 0
      },
      {
        id: 'WORKER_PARENT_CRASH',
        text: 'Worker exit - on parent crash',
        tooltip:
          'Click the crash action to run the worker and crash the app. Reopen the app and click the check button to check if previous worker has exited.',
        button: 'action-button',
        action: 'Crash',
        type: 'Worker-Parent-Crash',
        buttonSecond: 'action-button',
        actionSecond: 'Check',
        typeSecond: 'Worker-Parent-Crash',
        activeFromLength: 0
      }
    ]
  },
  {
    title: 'GUI',
    tooltip: 'GUI config checks',
    items: [
      {
        id: 'TRAY_DEFAULT',
        text: 'Tray - default',
        tooltip: 'Run ui.app.tray() to show the default tray',
        button: 'action-button',
        action: 'Run',
        type: 'Tray-Default',
        buttonSecond: 'action-button',
        actionSecond: 'Check',
        typeSecond: 'Tray-Default',
        activeFromLength: 0
      },
      {
        id: 'TRAY_CUSTOM_ICON',
        text: 'Tray - custom icon',
        tooltip: 'Run ui.app.tray({ icon }) to show the tray with custom icon',
        button: 'action-button',
        action: 'Run',
        type: 'Tray-Custom-Icon',
        buttonSecond: 'action-button',
        actionSecond: 'Check',
        typeSecond: 'Tray-Custom-Icon',
        activeFromLength: 0
      },
      {
        id: 'TRAY_CUSTOM_MENU',
        text: 'Tray - custom menu',
        tooltip: 'Run ui.app.tray({ menu }) to show the tray with custom menu',
        button: 'action-button',
        action: 'Run',
        type: 'Tray-Custom-Menu',
        buttonSecond: 'action-button',
        actionSecond: 'Check',
        typeSecond: 'Tray-Custom-Menu',
        activeFromLength: 0
      },
      {
        id: 'TRAY_MULTIPLE_RUNS',
        text: 'Tray - multiple runs',
        tooltip:
          'Run ui.app.tray() multiple times, only the last one should be shown',
        button: 'action-button',
        action: 'Run',
        type: 'Tray-Multiple-Runs',
        buttonSecond: 'action-button',
        actionSecond: 'Check',
        typeSecond: 'Tray-Multiple-Runs',
        activeFromLength: 0
      }
    ]
  },
  {
    title: 'Misc',
    tooltip: 'Miscellaneous checks.',
    items: [
      {
        id: 'MISC_USER_AGENT',
        text: 'User agent - check',
        tooltip: 'Click the button to check user agent.',
        button: 'action-button',
        action: 'Check',
        type: 'User-Agent',
        activeFromLength: 0
      },
      {
        id: 'MISC_EXTERNAL_LINK',
        text: 'External link - opens in browser',
        tooltip: 'Click the link to open in the browser.',
        link: 'https://keet.io',
        buttonSecond: 'action-button',
        actionSecond: 'Check',
        typeSecond: 'External-Link',
        activeFromLength: 0
      },
      {
        id: 'STORAGE',
        text: 'Storage - Platform application storage.',
        tooltip:
          'The application storage must be defined by discovery key or randomized.',
        button: 'action-button',
        action: 'Check',
        type: 'Storage-Check',
        activeFromLength: 0
      },
      {
        id: 'MISC_MOUSE_RIGHT_CLICK',
        text: 'Mouse - right-click',
        tooltip: 'Right-click anywhere to trigger contextmenu event.',
        activeFromLength: 0
      }
    ]
  }
]
