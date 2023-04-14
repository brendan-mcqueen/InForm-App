const monday = require('monday-sdk-js');
const api = monday();

function getFormulaColumns(boardId) {
  return api.query(`query {
    boards(ids: ${boardId}) {
      columns {
        id
        title
        type
      }
    }
  }`).then(res => {
    const columns = res.data.boards[0].columns;
    const formulaColumns = [];

    columns.forEach(column => {
      if (column.type === 'formula') {
        formulaColumns.push({
          id: column.id,
          title: column.title
        });
      }
    });

    return formulaColumns;
  });
}

function getItemValues(boardId, formulaColumnIds) {
  return api.query(`query {
    items (ids: ${boardId}) {
      id
      column_values(ids: [${formulaColumnIds.map(id => `"${id}"`).join(',')}]) {
        id
        value
      }
    }
  }`).then(res => {
    const items = res.data.items;
    const itemValues = {};

    items.forEach(item => {
      const values = {};
      item.column_values.forEach(column => {
        if (column.value) {
          values[column.id] = column.value;
        } else {
          values[column.id] = '';
        }
      });
      itemValues[item.id] = values;
    });

    return itemValues;
  });
}

function concatenateValues(values) {
  return values.join(" ");
}

function updateTextColumn(boardId, itemId, textColumnId, text) {
  const query = `mutation {
    change_column_value(board_id: ${boardId}, item_id: ${itemId}, column_id: "${textColumnId}", value: "{\\"text\\": \\"${text}\\"}") {
      id
    }
  }`;

  return api.query(query).then(res => {
    return res.data.change_column_value.id;
  });
}

function handleClick() {
  api.get('context').then(res => {
    const boardId = res.data.boardId;

    getFormulaColumns(boardId).then(columns => {
      const selectedColumns = columns.filter(column => {
        return columnSettings[column.id];
      });

      if (selectedColumns.length === 0) {
        api.alert('Please select at least one Formula column.');
        return;
      }

      getItemValues(boardId, selectedColumns.map(column => column.id)).then(itemValues => {
        api.batch(() => {
          Object.keys(itemValues).forEach(itemId => {
            const values = selectedColumns.map(column => itemValues[itemId][column.id]);
            const concatenatedValue = concatenateValues(values);
            updateTextColumn(boardId, itemId, textColumnId, concatenatedValue);
          });
        }).then(() => {
          api.close();
        });
      });
    });
  });
}

let columnSettings = {};
let textColumnId = '';

api.get('settings').then(res => {
  columnSettings = res.data.columns;
  textColumnId = res.data.textColumnId;

  document.getElementById('button').addEventListener('click', handleClick);
}).catch(err => {
  console.error(err);
});
