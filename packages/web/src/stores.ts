import { writable, derived, readable } from 'svelte/store';
import type { ExtensionsDirectory } from 'dbgate-types';
import invalidateCommands from './commands/invalidateCommands';
import getElectron from './utility/getElectron';
import { getSettings, useConfig, useSettings } from './utility/metadataLoaders';
import _ from 'lodash';
import { safeJsonParse } from 'dbgate-tools';
import { apiCall } from './utility/api';

export interface TabDefinition {
  title: string;
  closedTime?: number;
  icon: string;
  props: any;
  selected: boolean;
  busy: boolean;
  tabid: string;
  tabComponent: string;
  tabOrder?: number;
}

export function writableWithStorage<T>(defaultValue: T, storageName) {
  const init = localStorage.getItem(storageName);
  const res = writable<T>(init ? safeJsonParse(init, defaultValue, true) : defaultValue);
  res.subscribe(value => {
    localStorage.setItem(storageName, JSON.stringify(value));
  });
  return res;
}

export function writableSettingsValue<T>(defaultValue: T, storageName) {
  const res = derived(useSettings(), $settings => {
    const obj = $settings || {};
    // console.log('GET SETTINGS', $settings, storageName, obj[storageName]);
    return obj[storageName] ?? defaultValue;
  });
  return {
    ...res,
    set: value => apiCall('config/update-settings', { [storageName]: value }),
    update: async func => {
      const settings = await getSettings();
      const newValue = func(settings[storageName] ?? defaultValue);
      apiCall('config/update-settings', { [storageName]: newValue });
    },
  };
}

function subscribeCssVariable(store, transform, cssVariable) {
  store.subscribe(value => document.documentElement.style.setProperty(cssVariable, transform(value)));
}

export const selectedWidget = writableWithStorage('database', 'selectedWidget');
export const visibleWidgetSideBar = writableWithStorage(true, 'visibleWidgetSideBar');
export const visibleSelectedWidget = derived(
  [selectedWidget, visibleWidgetSideBar],
  ([$selectedWidget, $visibleWidgetSideBar]) => ($visibleWidgetSideBar ? $selectedWidget : null)
);
export const emptyConnectionGroupNames = writableWithStorage([], 'emptyConnectionGroupNames');
export const openedConnections = writable([]);
export const openedSingleDatabaseConnections = writable([]);
export const expandedConnections = writable([]);
export const currentDatabase = writable(null);
export const openedTabs = writableWithStorage<TabDefinition[]>([], 'openedTabs');
export const copyRowsFormat = writableWithStorage('textWithoutHeaders', 'copyRowsFormat');
export const extensions = writable<ExtensionsDirectory>(null);
export const visibleCommandPalette = writable(null);
export const commands = writable({});
export const currentTheme = getElectron()
  ? writableSettingsValue('theme-light', 'currentTheme')
  : writableWithStorage('theme-light', 'currentTheme');
export const currentEditorTheme = getElectron()
  ? writableSettingsValue(null, 'currentEditorTheme')
  : writableWithStorage(null, 'currentEditorTheme');
export const currentEditorFontSize = getElectron()
  ? writableSettingsValue(null, 'currentEditorFontSize')
  : writableWithStorage(null, 'currentEditorFontSize');
export const currentEditorFont = writableSettingsValue(null, 'editor.fontFamily');
export const activeTabId = derived([openedTabs], ([$openedTabs]) => $openedTabs.find(x => x.selected)?.tabid);
export const activeTab = derived([openedTabs], ([$openedTabs]) => $openedTabs.find(x => x.selected));
export const recentDatabases = writableWithStorage([], 'recentDatabases');
export const pinnedDatabases = writableWithStorage([], 'pinnedDatabases');
export const pinnedTables = writableWithStorage([], 'pinnedTables');
export const commandsSettings = writable({});
export const allResultsInOneTabDefault = writableWithStorage(false, 'allResultsInOneTabDefault');
export const archiveFilesAsDataSheets = writableWithStorage([], 'archiveFilesAsDataSheets');
export const commandsCustomized = derived([commands, commandsSettings], ([$commands, $commandsSettings]) =>
  _.mapValues($commands, (v, k) => ({
    // @ts-ignore
    ...v,
    ...$commandsSettings[k],
  }))
);

// export const visibleToolbar = writableWithStorage(true, 'visibleToolbar');
export const visibleToolbar = writable(false);
export const leftPanelWidth = writableWithStorage(300, 'leftPanelWidth');
export const currentDropDownMenu = writable(null);
export const openedModals = writable([]);
export const draggedPinnedObject = writable(null);
export const openedSnackbars = writable([]);
export const nullStore = readable(null, () => {});
export const currentArchive = writableWithStorage('default', 'currentArchive');
export const currentApplication = writableWithStorage(null, 'currentApplication');
export const isFileDragActive = writable(false);
export const selectedCellsCallback = writable(null);
export const loadingPluginStore = writable({
  loaded: false,
  loadingPackageName: null,
});
export const activeDbKeysStore = writableWithStorage({}, 'activeDbKeysStore');

export const currentThemeDefinition = derived([currentTheme, extensions], ([$currentTheme, $extensions]) =>
  $extensions.themes.find(x => x.themeClassName == $currentTheme)
);

let nativeMenuOnStartup = null;
export const visibleTitleBar = derived(useSettings(), $settings => {
  const electron = getElectron();
  if (!electron) return false;
  // console.log('visibleTitleBar:settings', $settings);
  if (!$settings) return false;
  if (nativeMenuOnStartup == null) {
    nativeMenuOnStartup = !!$settings['app.useNativeMenu'];
  }
  // console.log('nativeMenuOnStartup', nativeMenuOnStartup);
  return !$settings['app.fullscreen'] && !nativeMenuOnStartup;
});

export const visibleHamburgerMenuWidget = derived(useSettings(), $settings => {
  const electron = getElectron();
  if (!electron) return true;
  if (!$settings) return false;
  return !!$settings['app.fullscreen'];
});

subscribeCssVariable(visibleSelectedWidget, x => (x ? 1 : 0), '--dim-visible-left-panel');
// subscribeCssVariable(visibleToolbar, x => (x ? 1 : 0), '--dim-visible-toolbar');
subscribeCssVariable(leftPanelWidth, x => `${x}px`, '--dim-left-panel-width');
subscribeCssVariable(visibleTitleBar, x => (x ? 1 : 0), '--dim-visible-titlebar');

let activeTabIdValue = null;
activeTabId.subscribe(value => {
  activeTabIdValue = value;
  invalidateCommands();
});
export const getActiveTabId = () => activeTabIdValue;

let visibleCommandPaletteValue = null;
visibleCommandPalette.subscribe(value => {
  visibleCommandPaletteValue = value;
  invalidateCommands();
});
export const getVisibleCommandPalette = () => visibleCommandPaletteValue;

let visibleToolbarValue = null;
visibleToolbar.subscribe(value => {
  visibleToolbarValue = value;
  invalidateCommands();
});
export const getVisibleToolbar = () => visibleToolbarValue;

let openedTabsValue = null;
openedTabs.subscribe(value => {
  openedTabsValue = value;
  invalidateCommands();
});
export const getOpenedTabs = () => openedTabsValue;

let commandsValue = null;
commands.subscribe(value => {
  commandsValue = value;

  const electron = getElectron();
  if (electron) {
    electron.send('update-commands', JSON.stringify(value));
  }
});
export const getCommands = () => commandsValue;

let activeTabValue = null;
activeTab.subscribe(value => {
  activeTabValue = value;
});
export const getActiveTab = () => activeTabValue;

let currentConfigValue = null;
export const getCurrentConfig = () => currentConfigValue;

let recentDatabasesValue = null;
recentDatabases.subscribe(value => {
  recentDatabasesValue = value;
});
export const getRecentDatabases = () => _.compact(recentDatabasesValue);

let pinnedDatabasesValue = null;
pinnedDatabases.subscribe(value => {
  pinnedDatabasesValue = value;
});
export const getPinnedDatabases = () => _.compact(pinnedDatabasesValue);

let currentDatabaseValue = null;
currentDatabase.subscribe(value => {
  currentDatabaseValue = value;
  if (value?.connection?._id) {
    if (value?.connection?.singleDatabase) {
      openedSingleDatabaseConnections.update(x => _.uniq([...x, value?.connection?._id]));
    } else {
      openedConnections.update(x => _.uniq([...x, value?.connection?._id]));
      expandedConnections.update(x => _.uniq([...x, value?.connection?._id]));
    }
  }
  invalidateCommands();
});
export const getCurrentDatabase = () => currentDatabaseValue;

let currentSettingsValue = null;
export const getCurrentSettings = () => currentSettingsValue || {};

let extensionsValue = null;
extensions.subscribe(value => {
  extensionsValue = value;
});
export const getExtensions = () => extensionsValue;

let openedConnectionsValue = null;
openedConnections.subscribe(value => {
  openedConnectionsValue = value;
});
export const getOpenedConnections = () => openedConnectionsValue;

export function subscribeApiDependendStores() {
  useSettings().subscribe(value => {
    currentSettingsValue = value;
    commandsSettings.set((value || {}).commands || {});
    invalidateCommands();
  });

  useConfig().subscribe(value => {
    currentConfigValue = value;
    invalidateCommands();
    if (value.singleDatabase) {
      currentDatabase.set(value.singleDatabase);
    }
  });
}
