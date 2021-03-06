import { connect } from 'react-redux';
import { SETTINGS, doToast } from 'lbry-redux';
import { doPushDrawerStack, doPopDrawerStack, doSetPlayerVisible } from 'redux/actions/drawer';
import { doSetClientSetting } from 'redux/actions/settings';
import { selectCurrentRoute, selectDrawerStack } from 'redux/selectors/drawer';
import { makeSelectClientSetting } from 'redux/selectors/settings';
import Constants from 'constants'; // eslint-disable-line node/no-deprecated-api
import SettingsPage from './view';

const select = state => ({
  backgroundPlayEnabled: makeSelectClientSetting(SETTINGS.BACKGROUND_PLAY_ENABLED)(state),
  currentRoute: selectCurrentRoute(state),
  drawerStack: selectDrawerStack(state),
  enableDht: makeSelectClientSetting(Constants.SETTING_DHT_ENABLED)(state),
  keepDaemonRunning: makeSelectClientSetting(SETTINGS.KEEP_DAEMON_RUNNING)(state),
  language: makeSelectClientSetting(SETTINGS.LANGUAGE)(state),
  showNsfw: makeSelectClientSetting(SETTINGS.SHOW_NSFW)(state),
  showUriBarSuggestions: makeSelectClientSetting(SETTINGS.SHOW_URI_BAR_SUGGESTIONS)(state),
  receiveSubscriptionNotifications: makeSelectClientSetting(SETTINGS.RECEIVE_SUBSCRIPTION_NOTIFICATIONS)(state),
  receiveRewardNotifications: makeSelectClientSetting(SETTINGS.RECEIVE_REWARD_NOTIFICATIONS)(state),
  receiveInterestsNotifications: makeSelectClientSetting(SETTINGS.RECEIVE_INTERESTS_NOTIFICATIONS)(state),
  receiveCreatorNotifications: makeSelectClientSetting(SETTINGS.RECEIVE_CREATOR_NOTIFICATIONS)(state),
});

const perform = dispatch => ({
  notify: data => dispatch(doToast(data)),
  pushDrawerStack: () => dispatch(doPushDrawerStack(Constants.DRAWER_ROUTE_SETTINGS)),
  popDrawerStack: () => dispatch(doPopDrawerStack()),
  setClientSetting: (key, value) => dispatch(doSetClientSetting(key, value)),
  setPlayerVisible: () => dispatch(doSetPlayerVisible(false)),
});

export default connect(select, perform)(SettingsPage);
