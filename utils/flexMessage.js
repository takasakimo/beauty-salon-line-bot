// メニュー表のFlex Message生成
const createMenuTable = (menus) => {
  return {
    type: 'flex',
    altText: 'メニュー表',
    contents: {
      type: 'bubble',
      size: 'giga',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '💇 メニュー表',
            weight: 'bold',
            size: 'xl',
            color: '#FFFFFF',
            align: 'center'
          },
          {
            type: 'text',
            text: 'ご希望のメニューをお選びください',
            size: 'sm',
            color: '#FFFFFF',
            align: 'center',
            margin: 'md'
          }
        ],
        backgroundColor: '#FF6B6B',
        paddingAll: '20px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          // メニューヘッダー
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'メニュー',
                weight: 'bold',
                size: 'sm',
                color: '#666666',
                flex: 3
              },
              {
                type: 'text',
                text: '料金',
                weight: 'bold',
                size: 'sm',
                color: '#666666',
                align: 'center',
                flex: 2
              },
              {
                type: 'text',
                text: '時間',
                weight: 'bold',
                size: 'sm',
                color: '#666666',
                align: 'center',
                flex: 1
              }
            ],
            backgroundColor: '#F0F0F0',
            paddingAll: '10px',
            margin: 'none'
          },
          {
            type: 'separator',
            margin: 'none'
          },
          // メニューリスト
          ...menus.map((menu, index) => [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: menu.name,
                  size: 'sm',
                  wrap: true,
                  flex: 3
                },
                {
                  type: 'text',
                  text: `¥${menu.price.toLocaleString()}`,
                  size: 'sm',
                  align: 'center',
                  flex: 2
                },
                {
                  type: 'text',
                  text: `${menu.duration}分`,
                  size: 'sm',
                  align: 'center',
                  flex: 1
                }
              ],
              paddingAll: '10px',
              action: {
                type: 'postback',
                data: `action=select_menu&menu_id=${menu.menu_id}`,
                displayText: `${menu.name}を選択`
              },
              backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
            }
          ]).flat()
        ],
        paddingAll: '0px'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'メニューをタップして選択してください',
            size: 'xs',
            color: '#999999',
            align: 'center'
          }
        ],
        backgroundColor: '#F0F0F0',
        paddingAll: '10px'
      }
    }
  };
};

// 時間選択画面のFlex Message生成
const createTimeSelection = (menu, availableTimes) => {
  return {
    type: 'flex',
    altText: '予約時間選択',
    contents: {
      type: 'bubble',
      size: 'giga',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📅 予約時間選択',
            weight: 'bold',
            size: 'xl',
            color: '#FFFFFF',
            align: 'center'
          },
          {
            type: 'text',
            text: menu.name,
            size: 'md',
            color: '#FFFFFF',
            align: 'center',
            margin: 'sm'
          },
          {
            type: 'text',
            text: `¥${menu.price.toLocaleString()} (${menu.duration}分)`,
            size: 'sm',
            color: '#FFFFFF',
            align: 'center'
          }
        ],
        backgroundColor: '#4ECDC4',
        paddingAll: '20px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '空き時間から選択してください',
            size: 'sm',
            color: '#666666',
            margin: 'md',
            align: 'center'
          },
          {
            type: 'separator',
            margin: 'md'
          },
          ...availableTimes.slice(0, 20).map(slot => {
            const date = new Date(slot.datetime);
            const dateStr = `${date.getMonth() + 1}/${date.getDate()}(${['日','月','火','水','木','金','土'][date.getDay()]})`;
            const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            
            return {
              type: 'button',
              action: {
                type: 'postback',
                label: `${dateStr} ${timeStr}～`,
                data: `action=select_time&menu_id=${menu.menu_id}&datetime=${slot.datetime}`,
                displayText: `${dateStr} ${timeStr}を選択`
              },
              style: 'secondary',
              margin: 'sm',
              height: 'sm'
            };
          })
        ],
        paddingAll: '20px'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'message',
              label: '戻る',
              text: '予約'
            },
            style: 'link',
            height: 'sm'
          }
        ],
        paddingAll: '10px'
      }
    }
  };
};

// 予約確認画面のFlex Message生成
const createConfirmation = (customer, menu, datetime) => {
  const reservationDate = new Date(datetime);
  const dateStr = `${reservationDate.getMonth() + 1}/${reservationDate.getDate()}(${['日','月','火','水','木','金','土'][reservationDate.getDay()]})`;
  const timeStr = `${reservationDate.getHours().toString().padStart(2, '0')}:${reservationDate.getMinutes().toString().padStart(2, '0')}`;
  
  const endTime = new Date(reservationDate);
  endTime.setMinutes(endTime.getMinutes() + menu.duration);
  const endTimeStr = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;

  return {
    type: 'flex',
    altText: '予約内容確認',
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '✅ 予約内容確認',
            weight: 'bold',
            size: 'xl',
            color: '#FFFFFF',
            align: 'center'
          }
        ],
        backgroundColor: '#FF6B6B',
        paddingAll: '20px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '以下の内容で予約を確定します',
            size: 'sm',
            color: '#666666',
            margin: 'md',
            align: 'center',
            wrap: true
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'お名前',
                size: 'sm',
                color: '#666666',
                flex: 2
              },
              {
                type: 'text',
                text: customer.real_name,
                size: 'sm',
                flex: 3,
                wrap: true
              }
            ],
            margin: 'lg'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '日付',
                size: 'sm',
                color: '#666666',
                flex: 2
              },
              {
                type: 'text',
                text: dateStr,
                size: 'sm',
                flex: 3
              }
            ],
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '時間',
                size: 'sm',
                color: '#666666',
                flex: 2
              },
              {
                type: 'text',
                text: `${timeStr}～${endTimeStr}`,
                size: 'sm',
                flex: 3
              }
            ],
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'メニュー',
                size: 'sm',
                color: '#666666',
                flex: 2
              },
              {
                type: 'text',
                text: menu.name,
                size: 'sm',
                flex: 3,
                wrap: true
              }
            ],
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '料金',
                size: 'sm',
                color: '#666666',
                flex: 2
              },
              {
                type: 'text',
                text: `¥${menu.price.toLocaleString()}`,
                size: 'sm',
                flex: 3,
                weight: 'bold',
                color: '#FF6B6B'
              }
            ],
            margin: 'md'
          },
          {
            type: 'separator',
            margin: 'lg'
          }
        ],
        paddingAll: '20px'
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'button',
            action: {
              type: 'postback',
              label: 'キャンセル',
              data: 'action=cancel_reservation'
            },
            style: 'secondary',
            flex: 1,
            height: 'sm'
          },
          {
            type: 'separator',
            margin: 'sm'
          },
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '予約確定',
              data: `action=confirm_reservation&menu_id=${menu.menu_id}&datetime=${datetime}&staff_id=1`
            },
            style: 'primary',
            flex: 1,
            height: 'sm',
            color: '#FF6B6B'
          }
        ],
        spacing: 'sm',
        paddingAll: '10px'
      }
    }
  };
};

module.exports = {
  createMenuTable,
  createTimeSelection,
  createConfirmation
};