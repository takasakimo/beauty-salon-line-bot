const customerController = require('./customerController');
const reservationController = require('./reservationController');
const menuController = require('./menuController');
const { client } = require('../config/line');

// イベントハンドラー
const handleEvent = async (event) => {
  console.log('受信イベント:', event);

  // 友だち追加イベント（follow）の処理
  if (event.type === 'follow') {
    return customerController.handleFollowEvent(event);
  }

  // メッセージイベントの処理
  if (event.type === 'message' && event.message.type === 'text') {
    return handleTextMessage(event);
  }

  // Postbackイベントの処理
  if (event.type === 'postback') {
    return handlePostback(event);
  }

  return Promise.resolve(null);
};

// テキストメッセージの処理
const handleTextMessage = async (event) => {
  const userId = event.source.userId;
  const messageText = event.message.text;

  try {
    // 顧客情報をチェック
    const customer = await customerController.getCustomer(userId);

    // 未登録の場合は登録処理
    if (!customer) {
      return await customerController.handleRegistration(event, userId, messageText);
    }

    // 登録済みの場合はコマンド処理
    return await handleCommand(event, customer, messageText);

  } catch (error) {
    console.error('メッセージ処理エラー:', error);
    const errorMessage = {
      type: 'text',
      text: 'システムエラーが発生しました。しばらく時間をおいてから再度お試しください。'
    };
    return client.replyMessage(event.replyToken, errorMessage);
  }
};

// コマンド処理（登録済み顧客向け）
const handleCommand = async (event, customer, messageText) => {
  const command = messageText.trim();

  switch (command) {
    case '予約':
      return await reservationController.showMenuTable(event, customer);

    case '予約確認':
      return await reservationController.showReservations(event, customer);

    case 'マイページ':
      return await customerController.showMyPage(event, customer);

    case 'メニュー':
      return await menuController.showMenuList(event);

    default:
      // その他のメッセージ
      const helpMessage = {
        type: 'text',
        text: `${customer.real_name}様\n\n以下のコマンドをお使いください：\n・「予約」- 新しい予約を取る\n・「予約確認」- 予約の確認・変更\n・「マイページ」- 個人情報・履歴確認\n・「メニュー」- サービス内容確認`
      };
      return client.replyMessage(event.replyToken, helpMessage);
  }
};

// Postbackイベント処理
const handlePostback = async (event) => {
  const userId = event.source.userId;
  const data = new URLSearchParams(event.postback.data);
  const action = data.get('action');

  try {
    // 顧客情報を取得
    const customer = await customerController.getCustomer(userId);

    if (!customer) {
      const errorMessage = {
        type: 'text',
        text: '顧客情報が見つかりません。最初から登録をお願いします。'
      };
      return client.replyMessage(event.replyToken, errorMessage);
    }

    switch (action) {
      case 'select_menu':
        const menuId = data.get('menu_id');
        return await reservationController.showTimeSelection(event, customer, menuId);

      case 'select_time':
        const selectedMenuId = data.get('menu_id');
        const selectedDateTime = data.get('datetime');
        return await reservationController.showConfirmation(event, customer, selectedMenuId, selectedDateTime);

      case 'confirm_reservation':
        const confirmMenuId = data.get('menu_id');
        const confirmDateTime = data.get('datetime');
        const staffId = data.get('staff_id') || 1;
        return await reservationController.confirmReservation(event, customer, confirmMenuId, confirmDateTime, staffId);

      case 'cancel_reservation':
        const cancelMessage = {
          type: 'text',
          text: '予約をキャンセルしました。\n「予約」と入力して最初からやり直してください。'
        };
        return client.replyMessage(event.replyToken, cancelMessage);

      default:
        return Promise.resolve(null);
    }

  } catch (error) {
    console.error('Postback処理エラー:', error);
    const errorMessage = {
      type: 'text',
      text: 'エラーが発生しました。もう一度お試しください。'
    };
    return client.replyMessage(event.replyToken, errorMessage);
  }
};

module.exports = {
  handleEvent
};