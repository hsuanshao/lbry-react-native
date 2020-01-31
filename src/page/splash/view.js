import React from 'react';
import { Lbry, doPreferenceGet, isURIValid } from 'lbry-redux';
import { Lbryio } from 'lbryinc';
import { ActivityIndicator, DeviceEventEmitter, Linking, NativeModules, Platform, Text, View } from 'react-native';
import { NavigationActions, StackActions } from 'react-navigation';
import { decode as atob } from 'base-64';
import { navigateToUri, transformUrl } from 'utils/helper';
import moment from 'moment';
import AsyncStorage from '@react-native-community/async-storage';
import Button from 'component/button';
import ProgressBar from 'component/progressBar';
import PropTypes from 'prop-types';
import Colors from 'styles/colors';
import Constants, { DrawerRoutes, InnerDrawerRoutes } from 'constants'; // eslint-disable-line node/no-deprecated-api
import splashStyle from 'styles/splash';
import RNFS from 'react-native-fs';

const BLOCK_HEIGHT_INTERVAL = 1000 * 60 * 2.5; // every 2.5 minutes

class SplashScreen extends React.PureComponent {
  static navigationOptions = {
    title: 'Splash',
  };

  state = {
    accountUnlockFailed: false,
    daemonReady: false,
    details: __('Starting up'),
    message: __('Connecting'),
    isRunning: false,
    isLagging: false,
    launchUrl: null,
    isDownloadingHeaders: false,
    headersDownloadProgress: 0,
    shouldAuthenticate: false,
    subscriptionsFetched: false,
    liteMode: false,
  };

  updateStatus() {
    const { authenticate } = this.props;

    if (this.state.liteMode) {
      // authenticate immediately
      NativeModules.VersionInfo.getAppVersion().then(appVersion => {
        this.setState({ shouldAuthenticate: true });
        NativeModules.Firebase.getMessagingToken()
          .then(firebaseToken => {
            console.log(firebaseToken);
            authenticate(appVersion, Platform.OS, firebaseToken);
          })
          .catch(() => authenticate(appVersion, Platform.OS));
      });
    } else {
      Lbry.status().then(status => {
        this._updateStatusCallback(status);
      });
    }
  }

  navigateToMain = () => {
    const { lastRouteInStack, navigation, notify, verifyUserEmail, verifyUserEmailFailure } = this.props;
    const resetAction = StackActions.reset({
      index: 0,
      actions: [NavigationActions.navigate({ routeName: 'Main' })],
    });
    navigation.dispatch(resetAction);

    const launchUrl =
      navigation.state.params && navigation.state.params.launchUrl
        ? navigation.state.params.launchUrl
        : this.state.launchUrl;
    if (launchUrl) {
      navigateToUri(navigation, transformUrl(launchUrl));
    } else if (lastRouteInStack) {
      // no launch url, check if there's a last route in stack to navigate to.
      const { route, params } = lastRouteInStack;
      if (route) {
        if (DrawerRoutes.includes(route)) {
          navigation.navigate({ routeName: route, params });
        } else if (!InnerDrawerRoutes.includes(route) && isURIValid(route)) {
          navigateToUri(navigation, route);
        }
      }
    }
  };

  componentWillReceiveProps(nextProps) {
    const { emailToVerify, getSync, setEmailToVerify, verifyUserEmail, verifyUserEmailFailure } = this.props;
    const { daemonReady, shouldAuthenticate, liteMode } = this.state;
    const { user } = nextProps;

    if (liteMode && user && user.id) {
      this.navigateToLiteMode();
    } else if (daemonReady && shouldAuthenticate && user && user.id) {
      this.setState({ shouldAuthenticate: false }, () => {
        // user is authenticated, navigate to the main view
        if (user.has_verified_email) {
          NativeModules.UtilityModule.getSecureValue(Constants.KEY_WALLET_PASSWORD).then(walletPassword => {
            getSync(walletPassword, () => {
              this.getUserSettings();
            });
          });
          this.navigateToMain();
          return;
        }

        this.navigateToMain();
      });
    }
  }

  navigateToLiteMode = () => {
    const resetAction = StackActions.reset({
      index: 0,
      actions: [NavigationActions.navigate({ routeName: 'LiteFile', params: { url: this.state.launchUrl } })],
    });
    navigation.dispatch(resetAction);
  };

  getUserSettings = () => {
    const { populateSharedUserState } = this.props;

    doPreferenceGet(
      'shared',
      preference => {
        populateSharedUserState(preference);
      },
      error => {
        /* failed */
      },
    );
  };

  onNotificationTargetLaunch = evt => {
    if (evt.url && evt.url.startsWith('lbry://')) {
      this.setState({ launchUrl: evt.url });
    }
  };

  finishSplashScreen = () => {
    const {
      authenticate,
      balanceSubscribe,
      blacklistedOutpointsSubscribe,
      filteredOutpointsSubscribe,
      getSync,
      updateBlockHeight,
      user,
    } = this.props;

    // Lbry.resolve({ urls: 'lbry://one' }).then(() => {
    // Leave the splash screen
    balanceSubscribe();
    blacklistedOutpointsSubscribe();
    filteredOutpointsSubscribe();

    if (user && user.id && user.has_verified_email) {
      // user already authenticated
      NativeModules.UtilityModule.getSecureValue(Constants.KEY_WALLET_PASSWORD).then(walletPassword => {
        getSync(walletPassword, () => {
          this.getUserSettings();
        });
      });
      this.navigateToMain();
    } else {
      NativeModules.VersionInfo.getAppVersion().then(appVersion => {
        this.setState({ shouldAuthenticate: true });
        NativeModules.Firebase.getMessagingToken()
          .then(firebaseToken => {
            console.log(firebaseToken);
            authenticate(appVersion, Platform.OS, firebaseToken);
          })
          .catch(() => authenticate(appVersion, Platform.OS));
      });
    }
    // });
  };

  handleAccountUnlockFailed() {
    this.setState({ accountUnlockFailed: true });
  }

  _updateStatusCallback(status) {
    const { fetchSubscriptions, getSync, setClientSetting } = this.props;
    const startupStatus = status.startup_status;
    const walletStatus = status.wallet;

    // At the minimum, wallet should be started and blocks_behind equal to 0 before calling resolve
    const hasStarted = startupStatus.stream_manager && startupStatus.wallet && status.wallet.blocks_behind <= 0;
    if (hasStarted) {
      // Wait until we are able to resolve a name before declaring
      // that we are done.
      // TODO: This is a hack, and the logic should live in the daemon
      // to give us a better sense of when we are actually started
      this.setState({
        daemonReady: true,
        isLagging: false,
        isRunning: true,
      });

      Lbry.wallet_status().then(secureWalletStatus => {
        // For now, automatically unlock the wallet if a password is set so that downloads work
        NativeModules.UtilityModule.getSecureValue(Constants.KEY_WALLET_PASSWORD).then(password => {
          if ((secureWalletStatus.is_encrypted && !secureWalletStatus.is_locked) || secureWalletStatus.is_locked) {
            this.setState({
              message: __('Unlocking account'),
              details: __('Decrypting wallet'),
            });

            // unlock the wallet and then finish the splash screen
            Lbry.wallet_unlock({ password: password || '' }).then(unlocked => {
              if (unlocked) {
                this.setState({
                  message: __('Authenticating'),
                  details: __('Waiting for authentication'),
                });
                this.finishSplashScreen();
              } else {
                this.handleAccountUnlockFailed();
              }
            });
          } else {
            this.setState({
              message: __('Authenticating'),
              details: __('Waiting for authentication'),
            });
            this.finishSplashScreen();
          }
        });
      });

      return;
    }

    const headerSyncProgress = walletStatus ? walletStatus.headers_synchronization_progress : null;
    if (headerSyncProgress && headerSyncProgress < 100) {
      this.setState({
        isDownloadingHeaders: true,
        headersDownloadProgress: headerSyncProgress,
      });
    } else {
      // set downloading flag to false if blockchain_headers isn't in the status response
      this.setState({
        isDownloadingHeaders: false,
      });
    }

    if (headerSyncProgress < 100) {
      const downloadProgress = isNaN(parseInt(headerSyncProgress, 10)) ? '0' : headerSyncProgress || '0';
      this.setState({
        message: __('Blockchain Sync'),
        details: __('Catching up with the blockchain (%progress%%)', { progress: downloadProgress }),
      });
    } else if (walletStatus && walletStatus.blocks_behind > 0) {
      const behind = walletStatus.blocks_behind;
      const behindText =
        behind === 1 ? __('%num% block behind', { num: behind }) : __('%num% blocks behind', { num: behind });
      this.setState({
        message: __('Blockchain Sync'),
        details: behindText,
      });
    } else {
      this.setState({
        message: __('Network Loading'),
        details: __('Initializing LBRY service'),
      });
    }

    setTimeout(() => {
      this.updateStatus();
    }, 1000);
  }

  componentWillMount() {
    DeviceEventEmitter.addListener('onNotificationTargetLaunch', this.onNotificationTargetLaunch);
  }

  componentWillUnmount() {
    DeviceEventEmitter.removeListener('onNotificationTargetLaunch', this.onNotificationTargetLaunch);
  }

  componentDidMount() {
    NativeModules.Firebase.track('app_launch', null);
    NativeModules.Firebase.setCurrentScreen('Splash');

    this.props.fetchRewardedContent();
    Linking.getInitialURL().then(url => {
      if (url) {
        this.setState({ launchUrl: url });
      }

      NativeModules.UtilityModule.getNotificationLaunchTarget().then(target => {
        if (target) {
          const liteMode = target.indexOf('liteMode=1') > -1;
          android.util.Log.d('setting liteMode=' + liteModoe);
          this.setState({ launchUrl: target, liteMode });
        }

        // Only connect after checking initial launch url / notification launch target
        Lbry.connect()
          .then(() => {
            this.updateStatus();
          })
          .catch(e => {
            this.setState({
              isLagging: true,
              message: __('Connection Failure'),
              details: __(
                'We could not establish a connection to the SDK. Your data connection may be preventing LBRY from connecting. Contact hello@lbry.com if you think this is a software bug.',
              ),
            });
          });
      });
    });

    // Start measuring the first launch time from the splash screen
    // (time to first user interaction - after first run completed)
    AsyncStorage.getItem('hasLaunched').then(value => {
      if (value !== 'true') {
        AsyncStorage.setItem('hasLaunched', 'true');
        // only set firstLaunchTime since we've determined that this is the first app launch ever
        AsyncStorage.setItem('firstLaunchTime', String(moment().unix()));
      }
    });
  }

  handleContinueAnywayPressed = () => {
    this.setState(
      {
        accountUnlockFailed: false,
        message: __('Authenticating'),
        details: __('Waiting for authentication'),
      },
      () => this.finishSplashScreen(),
    );
  };

  render() {
    const { accountUnlockFailed, message, details, isLagging, isRunning } = this.state;

    if (accountUnlockFailed) {
      return (
        <View style={splashStyle.container}>
          <Text style={splashStyle.errorTitle}>{__('Oops! Something went wrong.')}</Text>
          <Text style={splashStyle.paragraph}>
            {__(
              'Your wallet failed to unlock, which means you may not be able to play any videos or access your funds.',
            )}
          </Text>
          <Text style={splashStyle.paragraph}>
            {__(
              'You can try to fix this by tapping Stop on the LBRY service notification and starting the app again. If the problem continues, you may have to reinstall the app and restore your account.',
            )}
          </Text>

          <Button
            style={splashStyle.continueButton}
            theme={'light'}
            text={__('Continue anyway')}
            onPress={this.handleContinueAnywayPressed}
          />
        </View>
      );
    }

    return (
      <View style={splashStyle.container}>
        <Text style={splashStyle.title}>LBRY</Text>
        {this.state.isDownloadingHeaders && (
          <ProgressBar
            color={Colors.White}
            style={splashStyle.progress}
            progress={this.state.headersDownloadProgress}
          />
        )}
        {!this.state.isDownloadingHeaders && (
          <ActivityIndicator color={Colors.White} style={splashStyle.loading} size={'small'} />
        )}
        <Text style={splashStyle.message}>{message}</Text>
        <Text style={splashStyle.details}>{details}</Text>
      </View>
    );
  }
}

export default SplashScreen;
