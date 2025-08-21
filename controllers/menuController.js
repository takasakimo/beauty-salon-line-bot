const { dbClient } = require('../config/database');
const { client } = require('../config/line');

// メニュー一覧表示（テキスト版）
const showMenuList = async (event) => {
  try {
    const menuResult = await dbClient.query(
      'SELECT name, price, duration FROM menus ORDER BY menu_id'
    );

    let menuText = '【メニュー一覧】\n\n';
    menuResult.rows.forEach(menu => {
      menuText += `◆ ${menu.name}\n`;
      menuText += `  ¥${menu.price.toLocaleString()} (${menu.duration}分)\n\n`;
    });

    const menuMessage = {
      type: 'text',
      text: menuText
    };
    return client.replyMessage(event.replyToken, menuMessage);

  } catch (error) {
    console.error('メニュー一覧取得エラー:', error);
    const errorMessage = {
      type: 'text',
      text: 'メニュー情報の取得中にエラーが発生しました。'
    };
    return client.replyMessage(event.replyToken, errorMessage);
  }
};

module.exports = {
  showMenuList
};