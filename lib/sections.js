export const sections = [
  {
    title: 'Cold-start',
    tooltip: 'These checks ensure the app cold-starts correctly. The app should be closed before running each check.',
    items: [
      {
        id: 'COLD_START_LINK',
        text: 'Cold-start link click - link opens app',
        tooltip: 'Make sure this app is closed. Then, open the app by clicking the link: pear://[app-key]',
        active: true
      },
      {
        id: 'COLD_START_FRAGMENT',
        text: 'Fragment - link click loads fragment',
        tooltip: 'Make sure this app is closed. Then, open this app by clicking the link: pear://[app-key]/nested/entrypoint.html',
        active: true
      },
      {
        id: 'COLD_START_ENTRYPOINT',
        text: 'Entrypoint - link click loads entrypoint',
        tooltip: 'Make sure this app is closed. Then, open this app by clicking the link: pear://[app-key]/nested/entrypoint.html',
        active: true
      },
      {
        id: 'COLD_START_ENTRYPOINT_FRAGMENT',
        text: 'Entrypoint fragment - link click loads entrypoint with fragment',
        tooltip: 'Make sure this app is closed. Then, open this app by clicking the link: pear://[app-key]/nested/entrypoint.html',
        active: true
      },
      {
        id: 'COLD_START_INVITE_CODE',
        text: 'Legacy invite code - link click loads invite code as fragment',
        tooltip: 'Make sure this app is closed. Then, open this app by clicking a link with an invite code of type Keet: pear://[app-key]/xeb7mugj8...',
        active: true
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
        active: true
      },
      {
        id: 'WAKE_UP_LINK',
        text: 'Wake-up link click - link click from inside the app',
        tooltip: 'This check is disabled pending a platform update with <a href=\'https://github.com/holepunchto/pear/pull/222\'>PR 222 - Include fragment to wakeup message</a>',
        link: '<app-key>/xeb7mugj8sbaytkf5qqu9z1snegtibqneysssdqu35em4zw3ou9wcmz8ha4er6e759tams9eeebo6j6ueifyb4oaeohnijbyxfzessxjneaqs8ux',
        active: false
      },
      {
        id: 'WAKE_UP_FRAGMENT',
        text: 'Fragment - link click loads fragment while app is open',
        tooltip: 'This check is disabled pending a platform update with <a href=\'https://github.com/holepunchto/pear/pull/222\'>PR 222 - Include fragment to wakeup message</a>',
        active: false
      },
      {
        id: 'WAKE_UP_ENTRYPOINT',
        text: 'Entrypoint - link click loads entrypoint',
        tooltip: 'Make sure this app is already open. Then, click a link with a valid entrypoint: pear://[app-key]/nested/entrypoint.html',
        active: true
      },
      {
        id: 'WAKE_UP_ENTRYPOINT_FRAGMENT',
        text: 'Entrypoint Fragment - link click loads entrypoint with fragment',
        tooltip: 'This check is disabled pending a platform update with <a href=\'https://github.com/holepunchto/pear/pull/222\'>PR 222 - Include fragment to wakeup message</a>',
        active: false
      },
      {
        id: 'WAKE_UP_INVITE_CODE',
        text: 'Legacy invite code - link click loads invite code as fragment',
        tooltip: 'This check is disabled pending a platform update with <a href=\'https://github.com/holepunchto/pear/pull/222\'>PR 222 - Include fragment to wakeup message</a>',
        active: false
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
        tooltip: 'Click to get the microphone status',
        button: 'action-button',
        action: 'Status',
        type: 'Microphone',
        active: true
      },
      {
        id: 'MEDIA_CAMERA_STATUS',
        text: 'Camera - status',
        tooltip: 'Click to get the camera status',
        button: 'action-button',
        action: 'Status',
        type: 'Camera',
        active: true
      },
      {
        id: 'MEDIA_SCREEN_STATUS',
        text: 'Screen - status',
        tooltip: 'Click to get the screen status',
        button: 'action-button',
        action: 'Status',
        type: 'Screen',
        active: true
      },
      {
        id: 'MEDIA_MICROPHONE_ACCESS',
        text: 'Microphone - access',
        tooltip: 'Click to ask for microphone access',
        button: 'action-button',
        action: 'Access',
        type: 'Microphone',
        active: true
      },
      {
        id: 'MEDIA_CAMERA_ACCESS',
        text: 'Camera - access',
        tooltip: 'Click to ask for camera access',
        button: 'action-button',
        action: 'Access',
        type: 'Camera',
        active: true
      },
      {
        id: 'MEDIA_SCREEN_ACCESS',
        text: 'Screen - access',
        tooltip: 'Click to ask for screen access',
        button: 'action-button',
        action: 'Access',
        type: 'Screen',
        active: true
      }
    ]
  }
]
