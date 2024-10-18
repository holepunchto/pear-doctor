import os from 'os'

export const sections = [
  {
    title: 'Cold-start',
    tooltip: 'These checks ensure the app cold-starts correctly. The app should be closed before running each check.',
    items: [
      {
        id: 'COLD_START_LINK',
        text: 'Cold-start link click - link opens app',
        tooltip: 'Make sure this app is closed. Then, open the app by clicking the link: pear://[app-key]',
        activeFromLength: 0
      },
      {
        id: 'COLD_START_FRAGMENT',
        text: 'Fragment - link click loads fragment',
        tooltip: 'Make sure this app is closed. Then, open the app by clicking the link: pear://[app-key]/#fragment',
        activeFromLength: 0
      },
      {
        id: 'COLD_START_ENTRYPOINT',
        text: 'Entrypoint - link click loads entrypoint',
        tooltip: 'Make sure this app is closed. Then, open the app by clicking the link: pear://[app-key]/nested/entrypoint.html',
        activeFromLength: 0
      },
      {
        id: 'COLD_START_ENTRYPOINT_FRAGMENT',
        text: 'Entrypoint fragment - link click loads entrypoint with fragment',
        tooltip: 'Make sure this app is closed. Then, open the app by clicking the link: pear://[app-key]/nested/entrypoint.html#fragment',
        activeFromLength: 0
      },
      {
        id: 'COLD_START_INVITE_CODE',
        text: 'Legacy invite code - link click loads invite code as fragment',
        tooltip: 'Make sure this app is closed. Then, open the app by clicking a link with an invite code of type Keet: pear://[app-key]/xeb7mugj8...',
        activeFromLength: 0
      }
    ]
  },
  {
    title: 'Wake-up',
    tooltip: 'These checks ensure the app wakes up correctly. The app should be open while running these checks.',
    items: [
      {
        id: 'WAKE_UP_LINK',
        text: 'Wake-up link click - link click while app is open',
        tooltip: 'Make sure this app is already open. Then, click the link: pear://[app-key]>',
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
        tooltip: 'Make sure this app is already open. Then, click the link: pear://[app-key]/nested/entrypoint.html#fragment',
        tooltipInactive: 'This check is disabled pending a platform update with <a href=\'https://github.com/holepunchto/pear/pull/222\'>PR 222 - Include fragment to wakeup message</a>',
        activeFromLength: 4041
      },
      {
        id: 'WAKE_UP_ENTRYPOINT',
        text: 'Entrypoint - link click loads entrypoint',
        tooltip: 'Make sure this app is already open. Then, click the link: pear://[app-key]/nested/entrypoint.html',
        tooltipInactive: 'This check is disabled pending a platform update with <a href=\'https://github.com/holepunchto/pear/pull/222\'>PR 222 - Include fragment to wakeup message</a>',
        activeFromLength: 4041
      },
      {
        id: 'WAKE_UP_ENTRYPOINT_FRAGMENT',
        text: 'Entrypoint Fragment - link click loads entrypoint with fragment',
        tooltip: 'Make sure this app is already open. Then, click the link: pear://[app-key]/nested/entrypoint.html#fragment',
        tooltipInactive: 'This check is disabled pending a platform update with <a href=\'https://github.com/holepunchto/pear/pull/222\'>PR 222 - Include fragment to wakeup message</a>',
        activeFromLength: 4041
      },
      {
        id: 'WAKE_UP_INVITE_CODE',
        text: 'Legacy invite code - link click loads invite code as fragment',
        tooltip: 'Make sure this app is already open. Then, click a link with an invite code of type Keet: pear://[app-key]/xeb7mugj8...',
        tooltipInactive: 'This check is disabled pending a platform update with <a href=\'https://github.com/holepunchto/pear/pull/222\'>PR 222 - Include fragment to wakeup message</a>',
        activeFromLength: 4041
      }
    ]
  },
  {
    title: 'Media',
    tooltip: 'These checks ensure the system media access is working correctly. Click on the buttons to perform the checks.',
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
        tooltip: os.platform() === 'darwin'
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
        tooltip: os.platform() === 'darwin'
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
        tooltip: os.platform() === 'darwin'
          ? 'Grant screen permission to your terminal app in MacOS Settings. Click to ask for screen access.'
          : 'Click to ask for screen access.',
        button: 'action-button',
        action: 'Access',
        type: 'Screen',
        activeFromLength: 0
      }
    ]
  },
  {
    title: 'Lifecycle',
    tooltip: 'Lifecycle checks.',
    items: [
      {
        id: 'LIFECYCLE_ZOMBIE_SIDECARS',
        text: 'Sidecar processes - system has no zombies',
        tooltip: 'First, make sure no other pear commands are running in other terminals. Then, click to check if there are any zombie sidecar processes in the system.',
        button: 'action-button',
        action: 'Check',
        type: 'Zombie-Sidecar',
        activeFromLength: 0
      },
      {
        id: 'LIFECYCLE_TRUST_DIALOG',
        text: 'Trust dialog - run with a random key',
        tooltip: 'First, click the Random key in Nurse, trust dialog will appear, trust and confirm that. Then click Check (click Reset to generate a new random key)',
        button: 'action-button',
        action: 'Check',
        type: 'Trust-Dialog',
        activeFromLength: 0
      },
      {
        id: 'LIFECYCLE_TEARDOWN_NORMAL',
        text: 'Teardown - normal exit (less than 15s)',
        tooltip: 'Click the action, the app should close within 1 second. A green check should appear when you reopen the app to confirm the teardown.',
        button: 'action-button',
        action: 'Check',
        type: 'Teardown-Normal',
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
        tooltip: 'Click the action, the app should restart. Click the action again to check if the app restarts correctly.',
        button: 'action-button',
        action: 'Check',
        type: 'Restart-Platform',
        activeFromLength: 0
      },
      {
        id: 'LIFECYCLE_RESTART_CLIENT',
        text: 'Restart - client',
        tooltip: 'Click the action, the app should restart. Click the action again to check if the app restarts correctly.',
        button: 'action-button',
        action: 'Check',
        type: 'Restart-Client',
        activeFromLength: 0
      }
    ]
  }
]
