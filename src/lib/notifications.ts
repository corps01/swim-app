import { Capacitor } from '@capacitor/core'
import { env } from './env'
import { getSupabaseClient } from './supabase'

let started = false
let loggedIn = false
let activeUserId: string | undefined
let lastSaved: { userId: string; playerId: string } | null = null

async function savePlayerId(userId: string, playerId: string): Promise<void> {
  if (!playerId || (lastSaved?.userId === userId && lastSaved.playerId === playerId)) return
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('profiles')
    .update({ onesignal_player_id: playerId })
    .eq('id', userId)
  if (!error) lastSaved = { userId, playerId }
}

/**
 * Start OneSignal on a native build and store this device's subscription id
 * on the signed-in profile. Browsers and missing app ids are ignored.
 * The REST API key is never read here.
 */
export async function startOneSignal(userId: string | undefined): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  const appId = env.oneSignalAppId
  if (!appId) return

  const { default: OneSignal } = await import('@onesignal/capacitor-plugin')
  activeUserId = userId
  if (!started) {
    await OneSignal.initialize(appId)
    await OneSignal.Notifications.requestPermission(false)
    started = true
    OneSignal.User.pushSubscription.addEventListener('change', (event) => {
      const id = event.current.id
      if (activeUserId && id) void savePlayerId(activeUserId, id)
    })
  }

  if (!userId) {
    if (loggedIn) {
      await OneSignal.logout()
      loggedIn = false
    }
    return
  }
  await OneSignal.login(userId)
  loggedIn = true
  const playerId = await OneSignal.User.pushSubscription.getIdAsync()
  if (playerId) await savePlayerId(userId, playerId)
}
