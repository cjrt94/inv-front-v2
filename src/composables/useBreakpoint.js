import { ref, onMounted, onBeforeUnmount } from 'vue'

// Single wide-layout threshold: fixed side menu instead of the tab bar, two-column
// grids and centered modals instead of sheets.
//
// It sits at 600 px instead of Ionic's 768 because of the iPhone Duo: its inner
// screen is 669 px wide in portrait, so with the 768 threshold a 7.6-inch screen
// would keep showing the phone layout. Only widths between 600 and 767 px change
// layout (iPad in Split View and the Duo's inner screen in portrait); an iPhone in
// portrait (393–440) does not move, and in landscape it was already past 768.
//
// SCSS mirror: the `wide` breakpoint in assets/scss/utilities/_mixins.scss. If one
// changes, so does the other: they are the same threshold in two languages.
export const WIDE_LAYOUT = '(min-width: 600px)'

// `matchMedia` fires when the phone folds or unfolds and when entering or leaving
// Split View: the Duo's viewport changes without any navigation, so the layout
// cannot rely on a one-off measurement.
export function useBreakpoint(query = WIDE_LAYOUT) {
  const mq = window.matchMedia(query)
  const matches = ref(mq.matches)
  const onChange = (e) => { matches.value = e.matches }

  onMounted(() => mq.addEventListener('change', onChange))
  onBeforeUnmount(() => mq.removeEventListener('change', onChange))

  return matches
}
