# PAUSE App Store Readiness

## App Identity

- App name: PAUSE
- Category: Health & Fitness or Medical, depending on final positioning
- Age rating: likely 17+ because the app references gambling recovery and crisis resources
- Bundle ID placeholder: `com.pause.recovery`
- Android package placeholder: `com.pause.recovery`

## Required Before Submission

- Final app icon
- Splash screen
- App screenshots for iPhone and Android
- Privacy policy URL
- Terms of use URL
- Support URL
- In-app purchase product IDs
- Crisis-resource disclaimer copy
- Support Coach safety / moderation documentation
- Data deletion flow
- Restore purchases flow

## Suggested Subscription Products

- `pause_weekly`: $4.99/week
- `pause_monthly`: $14.99/month
- `pause_yearly`: $99/year

Emergency support, crisis resources, and the basic urge-interruption flow should remain free.

## Store Review Risks To Handle Clearly

- PAUSE must not appear to enable gambling.
- PAUSE must not provide odds, picks, predictions, betting strategy, or bankroll advice.
- PAUSE should clearly state that it is support, not therapy or emergency care.
- Self-harm or immediate danger content must route users to crisis resources.
- The app should explain how sensitive user data is stored, exported, and deleted.

## Beta Path

1. Run Expo locally.
2. Deploy the Support Coach backend and verify `/health`.
3. Set `EXPO_PUBLIC_API_BASE_URL` to the hosted HTTPS API URL.
4. Create Expo/EAS project.
5. Configure real bundle identifiers.
6. Build internal iOS and Android previews with EAS.
7. Test with 10-25 beta users.
8. Prepare TestFlight and Google Play internal testing.
9. Submit after legal/privacy review.
