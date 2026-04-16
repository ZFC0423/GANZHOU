# Front API Contract

## 1. Purpose

This document freezes the frontend-facing contract for the immersive Ganzhou experience site.

The goal is to clearly separate three kinds of fields:

- DB-backed fields: edited in admin and stored in MySQL
- Service-derived fields: assembled in the backend service layer for presentation
- AI protocol fields: generated at response time and not stored as content fields

All frontend interfaces still follow the unified response wrapper:

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

## 2. GET /api/front/home

### 2.1 Main purpose

Provide the homepage hero, chapter entrances, featured scenic items, curated articles, and AI entrance copy in one payload.

### 2.2 DB-backed fields

- `siteName`
- `siteDescription`
- `hero.image`
- `hero.note`
- `chapterEntries[].chapterLabel`
- `chapterEntries[].heroImage`
- `chapterEntries[].heroCaption`
- `chapterEntries[].routeLabel`
- `chapterEntries[].moodTone`
- `featuredScenic[]` items read scenic narrative fields from `scenic_spots`
- `curatedArticles[]` items read article quote from `articles`
- `featuredScenic[]` / `curatedArticles[]` selection order comes from `home_recommends`
- `featuredScenic[]` / `curatedArticles[]` may include:
  - `visualRole`
  - `summaryOverride`

### 2.3 Service-derived fields

- `hero.title`
- `hero.subtitle`
- `hero.primaryAction`
- `hero.secondaryAction`
- `chapterEntries[].chapterNo`
- `chapterEntries[].chapterEn`
- `chapterEntries[].path`
- `chapterEntries[].leadItem`
- `chapterEntries[].count`
- `aiEntry`
- `epilogue`
- `visualSystem`

### 2.4 Example shape

```json
{
  "siteName": "赣州长卷",
  "siteDescription": "A curated digital culture experience for Ganzhou",
  "hero": {
    "title": "赣州长卷",
    "subtitle": "A curated digital culture experience for Ganzhou",
    "image": "/immersive/hero/example.jpg",
    "note": "Enter the city before entering the menu",
    "primaryAction": {
      "label": "进入景点图谱",
      "path": "/scenic"
    },
    "secondaryAction": {
      "label": "向 AI 导览员提问",
      "path": "/ai-chat"
    }
  },
  "chapterEntries": [],
  "featuredScenic": [],
  "curatedArticles": [],
  "aiEntry": {},
  "epilogue": {},
  "visualSystem": {}
}
```

## 3. GET /api/front/scenic/list

### 3.1 Main purpose

Return scenic items for atlas-style browsing.

### 3.2 DB-backed fields

- `heroCaption`
- `routeLabel`
- `moodTone`
- `quote`
- `bestVisitSeason`
- `visitMode`
- `pairingSuggestion`
- `bestLightTime`
- `walkingIntensity`
- `photoPoint`
- `familyFriendly`

### 3.3 Service-derived fields

- `subtitle`
- `dek`
- `curatorNote`
- `coverImageMobile`
- `focalPointX`
- `focalPointY`
- `media`
- `path`

### 3.4 Example item

```json
{
  "id": 1,
  "name": "通天岩",
  "region": "章贡区",
  "heroCaption": "Stone caves, terrain and history overlap here.",
  "routeLabel": "Stone caves and the old city edge",
  "moodTone": "earth",
  "quote": "A place where the mountain speaks first.",
  "bestVisitSeason": "Spring and autumn",
  "visitMode": "Walking",
  "pairingSuggestion": "Pair with old city route",
  "bestLightTime": "Morning to dusk",
  "walkingIntensity": "Medium",
  "photoPoint": "Rock face turning point",
  "familyFriendly": true
}
```

## 4. GET /api/front/scenic/detail/:id

### 4.1 Main purpose

Return a single scenic dossier view.

### 4.2 Extra fields on detail

- `quickFacts`
- `relatedList`

### 4.3 Contract note

The narrative fields stay the same as the list item contract. Detail only adds richer presentation structures.

## 5. GET /api/front/article/list

### 5.1 Main purpose

Return article cards for chapter pages.

### 5.2 DB-backed fields

- `quote`

### 5.3 Service-derived fields

- `subtitle`
- `dek`
- `heroCaption`
- `curatorNote`
- `routeLabel`
- `moodTone`
- `coverImageMobile`
- `focalPointX`
- `focalPointY`
- `media`
- `path`

## 6. GET /api/front/article/detail/:id

### 6.1 Main purpose

Return a single article detail for the exhibition-style reading page.

### 6.2 Extra fields on detail

- `relatedList`
- `readingRoom`

### 6.3 Contract note

`readingRoom` is a service-layer presentation block and should not be stored directly in the database.

## 7. POST /api/front/ai/chat

### 7.1 Main purpose

Return a structured guide-style answer instead of only one text paragraph.

### 7.2 Protocol-only fields

- `leadTitle`
- `answerBlocks[]`
- `citations[]`
- `relatedCards[]`
- `followupPrompts[]`
- `heroSpotlight`

### 7.3 Compatibility fields

These can still be returned for internal use or fallback, but the frontend should primarily consume the new structured protocol:

- `answer`
- `directAnswer`
- `culturalContext`
- `relatedTopics`
- `relatedSpots`
- `nextSteps`
- `matchedContext`

## 8. POST /api/front/ai/trip-plan

### 8.1 Main purpose

Return a route-workshop style itinerary payload.

### 8.2 Protocol-only fields

- `routeTitle`
- `routeMood`
- `introNote`
- `days[]`
- `packingTips[]`
- `routeWarnings[]`
- `citations[]`
- `interestLabel`

### 8.3 Compatibility fields

- `summary`
- `pathPositioning`
- `suitableFor`
- `routeHighlights`
- `adjustmentSuggestions`
- `travelTips`
- `matchedContext`

## 9. Why this contract is frozen this way

- We only store fields that need long-term editorial control.
- We keep layout assembly logic in the service layer, because that is easier to adjust without repeated schema churn.
- We keep AI output as response protocol, because AI answers are generated content, not reusable editorial assets.
- This keeps the graduation project easier to explain:
  - database stores stable content
  - service layer assembles presentation
  - AI layer returns structured temporary output
