import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { useItems, useSettings } from './data'
import { AppLayout } from './ui/AppLayout'
import { ToastProvider } from './ui/Toast'
import { TodayScreen } from './screens/TodayScreen'
import { WardrobeScreen } from './screens/WardrobeScreen'
import { BeforeYouBuyScreen } from './screens/BeforeYouBuyScreen'
import { StatsScreen } from './screens/StatsScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ItemDetailScreen } from './screens/ItemDetailScreen'
import { ItemEditorScreen } from './screens/ItemEditorScreen'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { QuickCountScreen } from './screens/QuickCountScreen'
import { OutfitsScreen } from './screens/OutfitsScreen'
import { OutfitEditorScreen } from './screens/OutfitEditorScreen'
import { SellScreen } from './screens/SellScreen'
import { ImportScreen } from './screens/ImportScreen'

/** First run (nothing stored, not onboarded yet) goes to the welcome screen. */
function OnboardingGate() {
  const settings = useSettings()
  const items = useItems()
  const location = useLocation()
  if (settings === undefined || items === undefined) return null
  if (!settings.onboarded && items.length === 0) return <Navigate to="/welcome" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="welcome" element={<WelcomeScreen />} />
        <Route path="welcome/count" element={<QuickCountScreen />} />
        <Route path="import" element={<ImportScreen />} />
        <Route element={<OnboardingGate />}>
          <Route element={<AppLayout />}>
            <Route index element={<TodayScreen />} />
            <Route path="wardrobe" element={<WardrobeScreen />} />
            <Route path="before-you-buy" element={<BeforeYouBuyScreen />} />
            <Route path="stats" element={<StatsScreen />} />
            <Route path="settings" element={<SettingsScreen />} />
            <Route path="item/:id" element={<ItemDetailScreen />} />
            <Route path="*" element={<TodayScreen />} />
          </Route>
          <Route path="item/:id/edit" element={<ItemEditorScreen />} />
          <Route path="item/:id/sell" element={<SellScreen />} />
          <Route path="outfits" element={<OutfitsScreen />} />
          <Route path="outfits/new" element={<OutfitEditorScreen />} />
          <Route path="outfits/:id" element={<OutfitEditorScreen />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}
