# Pear Doctor

> The Pear Doctor Application

## Usage

```
pear run pear://<app-key>
```

## Development

```
git clone https://github.com/holepunchto/pear-doctor
cd pear-doctor
npm install
```

```
pear run --dev .
```

## License

Apache-2.0

# Details
Doctor and Nurse
- Doctor is the app where all the checks are done.
- Nurse is a little helper that helps carrying out the checks. It is essentially an html that will be open in your browser and shows a list of links that you can click to test out different checks.
- The idea is that Nurse can stay always open while Doctor can be opened and closed many times to check cold-starts, wakeups, etc.

Persistence

- Doctor persists the checklist in localStorage (https://github.com/holepunchto/pear-doctor/blob/b0b1ef87111a8301e4a01a310d66bf31cd799589/lib/doctor-checklist.js#L23) (this way you can close and reopen the app and the state is preserved) and it uses the current platform version as the storage key. This means, every time there is a new platform release the checklist is automatically reset. The checklist can also be reset manually by clicking the reset button.

Structure
- The main component is `lib/doctor-checklist.js`. This is where all the logic happens and where the actual checks are done
- The other components are all UI components (button, tooltip, etc)
- In the constructor of doctor-checklist, the doctor checks the current Pear config values (cold-start checks) and then  listens for the wakeup messages where it does the wake-up checks.
- Outside of the constructor, all the logic validation is done in small  private functions like `#isValidFragment`, `#isKeetInvite`, etc

Sections
- Doctor has different sections (cold-start, wake-up, media, lifecycle...).
- In sections.js (https://github.com/holepunchto/pear-doctor/blob/b0b1ef87111a8301e4a01a310d66bf31cd799589/lib/sections.js#L3) is where the sections and checks are defined. This is the array of checks that the doctor renders. The fields that we have in there are pretty basic: id, text, tooltip and then there is activeFromLength (this is the platform version length.  In this field you can set a length from which a check will be shown, otherwise is grayed out. For example, if you want a check to be available only from a certain  platform release length, this helps to render a check for a functionality that is now in platform's devkey but not yet in prod for example).
- Some of the items in there have these fields: button, action and type. eg:  button: 'action-button', action: 'Access', type: 'Microphone. The items that have this fields will display a button next to the check with a call to action. Then, here https://github.com/holepunchto/pear-doctor/blob/b0b1ef87111a8301e4a01a310d66bf31cd799589/lib/doctor-checklist.js#L212 in doctor-checklist, we map which action was called with the corresponding check to be done.

Keys and current status of functionalities
- The latest check that was added is a zombie sidecars check. This is already merged into the main branch and deployed in doctor's devkey. But it has not yet been released to prod key.
- The reason is, the prod key was currently held in my VM, but this will change now and I think the idea is that @dmc will hold the production key in his VM instead. (to be confirmed by @dmc).
- Once  @dmc has the new prod key ready, we'll need to update the alias in platform to point to the new one. For reference, this is the commit where I added the doctor alias (https://github.com/holepunchto/pear/commit/5274c21de28adf34b51e5bc7bcbff8962c92c3d1), so these are all the places where we would need to update the key.
- For reference,  these are the keys that are now in the holepunch seeders (added by @Hans):
  - dev --> pear://n9y4kydhg18sf6y95oco3i3qy3pax4mars4nw5dsf3umix5zojky
  - staging --> pear://wihdz9dpfcseaq6eg49ey3ihrpuossgwo581f566of7fak75t86y
  - production --> pear://3ih5k1t15xb9hrnz1mkd4jhamefis7ni4nwuus8f1w3j94yu831y
- They all live in my VM, but feel free to create new ones. The only one that is aliased in the pear repo is the production key.
- Once you have the new keys, we will need to ask @Hans to remove these from the seeders and include the new ones.

Deployment flow
- In case it helps, this is the deployment flow i was following at the moment (it comes from talks with @dmc):
```
# setup a vm
# git clone pear app
# install etc
# cd into your app's folder
pear stage --dry-run dev 
# (always dry-run first) check it looks good
pear stage dev 
# - this gives you what we call the devkey
pear seed dev
cd ..
mkdir staging
cd staging
pear dump <devkey> 
# this mirrors from the devkey to the staging dir
pear stage --dry-run staging 
# (always dry run first) check it looks good
pear stage staging
pear seed staging
cd ..
mkdir production
cd production
pear dump <stagekey> <productionfolder>
# this mirrors from your stagkey to the production dir
pear stage --dry-run production
# (always dry run first) check it looks good
pear stage production
pear seed production
pear release production 
```