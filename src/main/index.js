import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.ico'

import connectDB from './db';

async function getPartners() {
  try {
    console.log('second')
    const response = await global.dbclient.query(`SELECT p.*,
    case when sum(s.quantity) > 300000 then 15
      when sum(s.quantity) > 50000 THEN 10
      when sum(s.quantity) > 10000 then 5
      else 0
      END as discount
      from partners as p LEFT JOIN sales as s on p.id = s.partner_id
      GROUP BY p.id
    `)
    return response.rows
  } catch (e) {
    console.log('Ошибка', e)
  }
}

async function createPartner(event, partner) {
  const { organization_type, name, ceo, email, phone, address, inn, rating } = partner

  try {
    await global.dbclient.query(`INSERT into partners (organization_type, name, ceo, email, phone, address, inn, rating) 
values('${organization_type}', '${name}', '${ceo}', '${email}', '${phone}', '${address}', '${inn}', '${rating}')`)
    dialog.showMessageBox({ message: 'Успех! Партнер создан' })
  } catch (e) {
    console.log(e)
    dialog.showErrorBox('Ошибка', "Партнер с таким именем уже есть")
  }
}
async function updatePartner(event, partner) {
  const { id, organization_type, name, ceo, email, phone, address, inn, rating } = partner;

  try {
    await global.dbclient.query(`UPDATE partners
      SET ceo='${ceo}', name='${name}', address='${address}',
          organization_type='${organization_type}', email='${email}',
          phone='${phone}', inn='${inn}', rating='${rating}'
      WHERE partners.id = ${id};`)
    dialog.showMessageBox({ message: 'Успех! Данные обновлены' })
  } catch (e) {
    dialog.showErrorBox('Невозможно обновить партнера', 'Такой пользователь уже есть')
    return ('error')
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    icon: join(__dirname, '../../resources/icon.ico'),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  global.dbclient = await connectDB();

  ipcMain.handle('getPartners', getPartners);
  ipcMain.handle('createPartner', createPartner);
  ipcMain.handle('updatePartner', updatePartner);


  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
