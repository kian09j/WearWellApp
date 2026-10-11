import { Route, Routes } from 'react-router'
import { AppLayout } from './ui/AppLayout'
import { ToastProvider } from './ui/Toast'
import { TodayScreen } from './screens/TodayScreen'
import { WardrobeScreen } from './screens/WardrobeScreen'
import { BeforeYouBuyScreen } from './screens/BeforeYouBuyScreen'
import { StatsScreen } from './screens/StatsScreen'
import { SettingsScreen } from './screens/SettingsScreen'

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<TodayScreen />} />
          <Route path="wardrobe" element={<WardrobeScreen />} />
          <Route path="before-you-buy" element={<BeforeYouBuyScreen />} />
          <Route path="stats" element={<StatsScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
          <Route path="*" element={<TodayScreen />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}
