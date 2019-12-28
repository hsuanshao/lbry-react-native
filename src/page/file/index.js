import { connect } from 'react-redux';
import {
  doAbandonClaim,
  doFetchFileInfo,
  doFetchChannelListMine,
  doFetchClaimListMine,
  doFileGet,
  doPurchaseUri,
  doDeletePurchasedUri,
  doResolveUri,
  doResolveUris,
  doSearch,
  doSendTip,
  doToast,
  makeSelectIsUriResolving,
  makeSelectFileInfoForUri,
  makeSelectChannelForClaimUri,
  makeSelectClaimForUri,
  makeSelectContentPositionForUri,
  makeSelectContentTypeForUri,
  makeSelectMetadataForUri,
  makeSelectRecommendedContentForUri,
  makeSelectStreamingUrlForUri,
  makeSelectThumbnailForUri,
  makeSelectTitleForUri,
  selectBalance,
  selectMyChannelClaims,
  selectMyClaimUrisWithoutChannels,
  selectPurchasedUris,
  selectFailedPurchaseUris,
  selectPurchaseUriErrorMessage,
  selectResolvingUris,
  selectIsSearching,
} from 'lbry-redux';
import {
  doClaimEligiblePurchaseRewards,
  doFetchCostInfoForUri,
  doFetchViewCount,
  makeSelectCostInfoForUri,
  makeSelectViewCountForUri,
  selectRewardContentClaimIds,
  selectBlackListedOutpoints,
} from 'lbryinc';
import { doDeleteFile, doStopDownloadingFile } from 'redux/actions/file';
import { doPushDrawerStack, doPopDrawerStack, doSetPlayerVisible } from 'redux/actions/drawer';
import { doToggleFullscreenMode } from 'redux/actions/settings';
import { selectDrawerStack } from 'redux/selectors/drawer';
import FilePage from './view';

const select = (state, props) => {
  const { uri, fullUri } = props.navigation.state.params;
  const contentUri = fullUri || uri;
  const selectProps = { uri: contentUri };
  return {
    balance: selectBalance(state),
    blackListedOutpoints: selectBlackListedOutpoints(state),
    channels: selectMyChannelClaims(state),
    claim: makeSelectClaimForUri(contentUri)(state),
    drawerStack: selectDrawerStack(state),
    isResolvingUri: makeSelectIsUriResolving(contentUri)(state),
    contentType: makeSelectContentTypeForUri(contentUri)(state),
    costInfo: makeSelectCostInfoForUri(contentUri)(state),
    metadata: makeSelectMetadataForUri(contentUri)(state),
    fileInfo: makeSelectFileInfoForUri(contentUri)(state),
    rewardedContentClaimIds: selectRewardContentClaimIds(state, selectProps),
    channelUri: makeSelectChannelForClaimUri(contentUri, true)(state),
    position: makeSelectContentPositionForUri(contentUri)(state),
    purchasedUris: selectPurchasedUris(state),
    failedPurchaseUris: selectFailedPurchaseUris(state),
    myClaimUris: selectMyClaimUrisWithoutChannels(state),
    purchaseUriErrorMessage: selectPurchaseUriErrorMessage(state),
    streamingUrl: makeSelectStreamingUrlForUri(contentUri)(state),
    thumbnail: makeSelectThumbnailForUri(contentUri)(state),
    title: makeSelectTitleForUri(contentUri)(state),
    recommendedContent: makeSelectRecommendedContentForUri(contentUri)(state),
    resolvingUris: selectResolvingUris(state),
    isSearchingRecommendContent: selectIsSearching(state),
    viewCount: makeSelectViewCountForUri(contentUri)(state),
  };
};

const perform = dispatch => ({
  abandonClaim: (txid, nout) => dispatch(doAbandonClaim(txid, nout)),
  claimEligibleRewards: () => dispatch(doClaimEligiblePurchaseRewards()),
  deleteFile: (fileInfo, deleteFromDevice, abandonClaim) => {
    dispatch(doDeleteFile(fileInfo, deleteFromDevice, abandonClaim));
  },
  fetchFileInfo: uri => dispatch(doFetchFileInfo(uri)),
  fetchCostInfo: uri => dispatch(doFetchCostInfoForUri(uri)),
  fetchMyClaims: () => dispatch(doFetchClaimListMine()),
  fetchChannelListMine: () => dispatch(doFetchChannelListMine()),
  fetchViewCount: claimId => dispatch(doFetchViewCount(claimId)),
  fileGet: (uri, saveFile) => dispatch(doFileGet(uri, saveFile)),
  notify: data => dispatch(doToast(data)),
  popDrawerStack: () => dispatch(doPopDrawerStack()),
  pushDrawerStack: (routeName, params) => dispatch(doPushDrawerStack(routeName, params)),
  purchaseUri: (uri, costInfo, saveFile) => dispatch(doPurchaseUri(uri, costInfo, saveFile)),
  deletePurchasedUri: uri => dispatch(doDeletePurchasedUri(uri)),
  resolveUri: uri => dispatch(doResolveUri(uri)),
  resolveUris: uris => dispatch(doResolveUris(uris)),
  searchRecommended: query => dispatch(doSearch(query, 20, undefined, true)),
  sendTip: (amount, claimId, isSupport, successCallback, errorCallback) =>
    dispatch(doSendTip(amount, claimId, isSupport, successCallback, errorCallback)),
  setPlayerVisible: () => dispatch(doSetPlayerVisible(true)),
  stopDownload: (uri, fileInfo) => dispatch(doStopDownloadingFile(uri, fileInfo)),
  toggleFullscreenMode: mode => dispatch(doToggleFullscreenMode(mode)),
});

export default connect(
  select,
  perform
)(FilePage);
