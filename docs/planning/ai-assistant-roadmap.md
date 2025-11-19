# AI Recipe Assistant - Product Roadmap

## Vision

Transform recipe journaling from passive documentation into an active, intelligent partnership where AI helps bakers iterate, learn, and perfect their craft.

## Release Strategy

- **v1.0**: Core conversational assistant (MVP)
- **v1.1**: Enhanced conversations and memory
- **v1.2**: Proactive suggestions and quick actions
- **v2.0**: Multi-modal (vision + voice)
- **v2.1**: Collaborative intelligence and community insights
- **v3.0**: Predictive baking and guided workflows

---

## v1.0 - Core Assistant (Current Release)

**Release Date**: Q4 2025  
**Status**: ✅ In Development

### Features

- Slide-up chat panel (mobile-first)
- Context-aware recipe analysis
- Ingredient modification suggestions
- Natural language conversation
- Change preview and apply workflow
- Quick prompt buttons

### Technical Implementation

- Gemini 2.5 Flash integration
- Ephemeral chat state (in-memory)
- Optimistic UI updates via React Query
- Rate limiting (10 req/min)

### Success Metrics

- 40% of users try the assistant within first week
- Average 3+ messages per conversation
- 60% of suggested changes are applied
- <5 second average response time

### Known Limitations

- No conversation persistence
- Single-turn context only
- Text-only interface
- No proactive suggestions

---

## v1.1 - Enhanced Conversations

**Release Date**: Q1 2026  
**Status**: 📋 Planned

### Goals

- Enable long-running conversations across sessions
- Improve change management UX
- Better message formatting

### Features

#### Persistent Chat History

- New database model: `ChatMessage` table

  ```prisma
  model ChatMessage {
    id          String   @id @default(cuid())
    versionId   String
    role        String   // "user" | "assistant"
    content     String   @db.Text
    metadata    Json?    // AI response metadata
    createdAt   DateTime @default(now())

    version     RecipeVersion @relation(fields: [versionId], references: [id], onDelete: Cascade)
    @@index([versionId, createdAt])
  }
  ```

- Resume conversations when returning to a version
- Search through past AI suggestions
- Export conversation history

#### Multi-Step Changes

- Chain multiple modifications in one conversation
- "Apply All" vs "Apply Selected" options
- Preview all changes before applying
- Bulk undo/redo

#### Change History Log

- Track all AI-suggested modifications
- Timestamps and rationale for each change
- "Revert to before AI suggestion X" feature
- Analytics: "AI helped improve 12 recipes this month"

#### Enhanced Message Rendering

- Full markdown support (bold, italic, lists, code)
- Syntax highlighting for ingredient quantities
- Collapsible sections for long explanations
- Inline links to external resources

### Technical Implementation

- Prisma migration for `ChatMessage` model
- React Query mutations for chat persistence
- Markdown renderer component (react-markdown)
- Enhanced change diff viewer with multi-select

### Migration Strategy

- Existing v1.0 users: Conversations start fresh (no migration needed)
- New users: Chat history enabled by default
- Optional: "Export v1.0 conversation" before upgrade

### Success Metrics

- 70% of users return to previous AI conversations
- Average conversation length increases to 8+ messages
- 80% of multi-step changes are applied together
- User satisfaction score: 4.5+/5

**Estimated Effort**: 8 hours  
**Dependencies**: None

---

## v1.2 - Smart Suggestions

**Release Date**: Q2 2026  
**Status**: 📋 Planned

### Goals

- Proactive AI assistance without user initiation
- One-click recipe improvements
- Template-based recipe generation

### Features

#### Proactive Triggers

- **Validation Warnings**: Auto-open assistant when errors detected
  - "I noticed your hydration is 80% (high for beginners). Would you like tips?"
  - "Missing salt - this will affect flavor and gluten. Add now?"
- **Version Comparison Insights**: Detect significant changes
  - "Version 2 had 20% more butter. Want to discuss the impact?"
  - "You removed the preferment. This will change fermentation timing."
- **Badge Notifications**: Floating button shows "💡 3"
  - AI analyzes recipe in background (debounced)
  - Suggests improvements based on category best practices
  - Click to see recommendations

#### Quick Actions

Pre-programmed AI workflows for common tasks:

- **"Balance Baker's Percentages"**: Auto-fix flour/liquid ratios
- **"Convert to Metric"**: Change all imperial to grams/ml
- **"Double This Recipe"**: Smart scaling with rounding
- **"Make it Vegan"**: Replace eggs, dairy with alternatives
- **"Reduce Sugar by 25%"**: Adjust sweetness with explanation
- **"Add Sourdough Starter"**: Convert to preferment method

#### Recipe Templates

Generate variations from current recipe:

- "Make this a chocolate variation" → adds cocoa, adjusts liquid
- "Create tangzhong version" → adds water roux step
- "Convert to overnight cold proof" → adjusts yeast, timing

### Technical Implementation

- Background analysis worker (debounced on ingredient changes)
- Rule engine for proactive triggers
- Quick action templates with parameter substitution
- Streaming AI responses for faster perceived performance

### UI Enhancements

- Toast notifications: "💡 AI found 2 improvements"
- Floating button badge with count
- Quick action menu (long-press button)
- Template gallery modal

### Success Metrics

- 50% of users interact with proactive suggestions
- Quick actions used 200+ times/week
- Templates generate 50+ recipe variations/week
- Notification click-through rate: 30%+

**Estimated Effort**: 10 hours  
**Dependencies**: v1.1 (for conversation history)

---

## v2.0 - Visual & Voice

**Release Date**: Q3 2026  
**Status**: 🔬 Research

### Goals

- Multi-modal AI interaction (text + image + voice)
- Hands-free baking assistance
- Visual troubleshooting

### Features

#### Image Analysis

- **Upload bake photos** to chat:
  - "Why is my crumb so dense?" + photo
  - AI analyzes texture, color, shape
  - Compares to expected results for recipe
- **Visual troubleshooting** using Gemini Vision:
  - Over-proofed detection (collapsed structure)
  - Under-mixed signs (dense, tight crumb)
  - Browning issues (temperature adjustment needed)
- **Before/After comparison**:
  - Compare Version 1 bake photo vs Version 2
  - AI highlights visual improvements
  - Correlate changes with visual outcomes

#### Voice Interface

- **Speech-to-text** for input:
  - "Hey Assistant, what's the next step?"
  - Hands-free during active baking (sticky dough hands)
  - Continuous listening mode
- **Text-to-speech** for responses:
  - AI reads instructions aloud
  - Adjustable speed and voice
  - Background mode (listen while working)
- **Voice commands**:
  - "Set timer for 30 minutes"
  - "What's the hydration percentage?"
  - "Remind me to fold in 1 hour"

#### Combined Context

- Multi-modal conversations:
  - User: [uploads photo] "This is how it turned out"
  - User: "I increased butter by 50g"
  - AI: [analyzes photo + recipe changes] "The increased butter shows in the softer crumb. Consider reducing liquid next time to balance."

### Technical Implementation

**Image Upload**

- Extend chat message model: `photoUrl` field
- Reuse R2 storage for chat images
- Compress before upload (max 2MB)

**Gemini Vision API**

- Switch to `gemini-2.5-flash` (already vision-capable)
- Send image + text context in single request
- Parse visual analysis from response

**Speech Integration**

- **Option A**: Web Speech API (browser native, free)
  - Pros: No API cost, instant
  - Cons: Limited browser support, less accurate
- **Option B**: Deepgram API (cloud, paid)
  - Pros: High accuracy, multi-language
  - Cons: Additional cost (~$0.0043/min)
- **Recommendation**: Start with Web Speech API, add Deepgram as premium feature

**Voice UI**

- Microphone button in chat input
- Waveform visualization during recording
- Push-to-talk or continuous mode toggle
- Text preview before sending (confirm accuracy)

### UI Enhancements

- Camera icon in chat input (opens photo picker)
- Microphone button with recording indicator
- Image thumbnails in message bubbles
- Audio playback controls for AI responses

### Success Metrics

- 25% of users upload at least one photo
- Voice input used in 15% of conversations
- Visual troubleshooting successful 70%+ of time
- Average conversation becomes richer (more context)

### Privacy Considerations

- Images stored with same R2 privacy as recipe photos
- Voice data NOT stored (transcription only)
- User consent modal before first voice/image use
- Option to delete media from conversation

**Estimated Effort**: 16 hours  
**Dependencies**: v1.1 (chat persistence for image history)

---

## v2.1 - Collaborative Intelligence

**Release Date**: Q4 2026  
**Status**: 🔬 Research

### Goals

- Leverage aggregate user data for better suggestions
- Adapt AI to individual user preferences
- Advanced baker knowledge base

### Features

#### Community Insights

- **Aggregate learnings** (anonymized):
  - "Other bakers reduced sugar by 15% in chocolate cakes"
  - "Average sourdough hydration: 78% (based on 234 recipes)"
  - "92% of users loved this change" (on suggestion feedback)
- **Trend detection**:
  - "Tangzhong method is trending for soft breads"
  - "Cold fermentation gaining popularity (+45% this month)"
- **Category benchmarks**:
  - "Your hydration (65%) is lower than typical (72%)"
  - "Most successful versions use 2% salt"

#### Expert Mode

- **Advanced calculations**:
  - Desired dough temperature (DDT) formula
  - Preferment percentage recommendations
  - Enzymatic activity at different temperatures
- **Scientific explanations**:
  - Gluten development stages
  - Maillard reaction temperature curves
  - Starch gelatinization in baking
- **External resources**:
  - Link to King Arthur Baking guides
  - Reference The Bread Code YouTube channel
  - Cite research papers on baking science

#### Personalized Learning

- **User preference model**:
  - Always suggests grams (not cups)
  - Prefers overnight cold proof methods
  - Likes high-hydration breads
- **Feedback loop**:
  - "Was this suggestion helpful?" after each change
  - Learn from applied vs rejected suggestions
  - Adapt tone (casual vs technical based on questions)
- **Historical patterns**:
  - "You usually increase salt in iteration 2"
  - "Your breads tend to be under-salted (-10% avg)"
  - "You experiment with hydration often"

### Technical Implementation

**Data Collection (Opt-In)**

- New setting: "Share anonymous data to improve AI"
- Collect: ingredient ratios, changes made, ratings
- Aggregate weekly via background job
- Store in `AIInsights` table with anonymized IDs

**Insight Generation**

- Weekly cron job: analyze aggregated data
- Generate category-specific insights
- Cache insights in database (avoid real-time calculation)
- Expose via `/api/ai/insights` endpoint

**User Preference Tracking**

- Track: suggestion accept rate, feedback scores, common edits
- Store in `UserPreferences` JSON column
- Use in AI prompt: "User prefers metric units and high hydration"

**External Resource Integration**

- Curated links database (manually maintained initially)
- Keyword matching: "gluten" → link to gluten development guide
- Fallback: Google search results API

### Privacy & Ethics

**Data Sharing Consent**

- Opt-in modal on first assistant use
- Clear explanation of what's shared (ingredients, ratings)
- What's NOT shared (recipe names, photos, personal notes)
- Option to opt-out anytime (retroactive deletion)

**Anonymization**

- Strip user IDs, replace with hashed tokens
- Aggregate only (no individual recipe reconstruction)
- Public dashboard: "Community Insights" page

**Transparency**

- Show data sources: "Based on 1,247 bread recipes"
- Confidence scores: "85% confidence in this suggestion"
- Option to disable community insights (local-only mode)

### Success Metrics

- 60% opt-in rate for data sharing
- Community insights referenced in 40% of conversations
- Expert mode activated by 20% of users
- Personalization improves suggestion accept rate by 25%

**Estimated Effort**: 14 hours  
**Dependencies**: v1.1 (analytics on chat history), user auth system

---

## v3.0 - Predictive Baking

**Release Date**: 2027+  
**Status**: 💭 Concept

### Goals

- Predict recipe outcomes before baking
- Real-time guidance during active sessions
- Generate recipes from natural language
- Full AI-powered baking companion

### Features

#### Outcome Prediction

- **Success probability scoring**:
  - "Based on your ingredients: 75% likely chewy, 20% likely crispy"
  - Trained on user ratings + ingredient combinations
  - Factors: ratios, technique notes, user skill level
- **Environmental adjustments**:
  - Auto-detect location (with permission)
  - Adjust for altitude: "Reduce yeast by 15% at 5,000ft"
  - Humidity compensation: "Add 10g flour (dry climate)"
  - Temperature: "Proof time +30min (cold kitchen)"

#### Guided Workflows

- **Step-by-step wizard**:
  - "I'll walk you through bulk fermentation"
  - Real-time timers with push notifications
  - Contextual tips at each stage
- **Active baking session mode**:
  - Start session: AI knows you're currently baking
  - Voice-only interface (hands-free)
  - Proactive reminders: "Time to fold dough"
  - Troubleshoot mid-bake: "Oven too hot? Reduce to 450°F"
- **Timer integration**:
  - Set timers directly from chat: "Remind me in 45 minutes"
  - Multiple simultaneous timers (bulk fermentation, proofing, baking)
  - Smart scheduling: "Bake tomorrow 8am" → backtrack timing

#### Recipe Generation

- **Natural language creation**:
  - "Create a cinnamon roll recipe with 65% hydration"
  - "Generate vegan chocolate cake under 2 hours"
  - "Design a sourdough with my starter (saved in Version 2)"
- **Constraint-based generation**:
  - Dietary: vegan, gluten-free, keto, low-sugar
  - Time: under 1 hour, overnight, 3-day sourdough
  - Equipment: bread machine, no mixer, Dutch oven
- **Fusion recipes**:
  - "Combine my country loaf with chocolate babka"
  - "What if I made this dessert bread style?"

#### Machine Learning Enhancements

- **Custom model fine-tuning**:
  - Train on user's successful recipes
  - Learn individual technique quirks
  - Predict issues before they happen
- **Pattern recognition**:
  - "You tend to under-salt your breads (-12% avg)"
  - "Your Version 2 iterations always increase hydration"
  - "When you rate texture 5/5, butter is 15-18%"
- **Personalized suggestions**:
  - Based on taste profile (sweet tooth, salt lover)
  - Skill progression: unlock advanced techniques
  - Style matching: "recipes similar to your favorites"

### Technical Architecture

**Prediction Model**

- Train classifier on: ingredients → outcome (ratings, tags)
- Features: ratios, categories, techniques, environmental factors
- Model: Random Forest or Gradient Boosting (scikit-learn)
- Inference API: separate Python service

**Real-Time Session**

- WebSocket connection for live updates
- State machine: mixing → bulk → shaping → proofing → baking
- Timer events broadcast to client
- Voice assistant integration (continuous listening)

**Recipe Generator**

- LLM with structured output (Gemini or GPT-4)
- Prompt: constraints + user history + category templates
- Validation: ensure generated recipe is feasible
- Iterate if validation fails (up to 3 attempts)

**ML Infrastructure**

- Cloud GPU for model training (Google Vertex AI or AWS SageMaker)
- Scheduled retraining: weekly on new user data
- A/B testing framework: v1 model vs v2 model
- Monitoring: prediction accuracy, user satisfaction

### Research Questions

1. **How accurate can outcome prediction be?**
   - Need 1,000+ rated recipes for training
   - Baseline accuracy goal: 70%+
   - Challenge: subjective ratings (one person's "chewy" vs another's)

2. **Can we detect user skill level automatically?**
   - Track: recipe complexity attempted, success rates, terminology used
   - Adjust guidance complexity accordingly
   - Risk: condescending to experienced bakers

3. **What's the right UX for active baking sessions?**
   - Hands-free is critical (sticky dough)
   - But voice-only is hard for complex instructions
   - Hybrid: voice + glanceable timers?

4. **How to handle recipe generation quality?**
   - LLMs can generate nonsensical recipes
   - Need robust validation (ratio checks, category rules)
   - Fallback: template-based generation

### Success Metrics

- Outcome prediction accuracy: 70%+
- Active session retention: 60% complete full bake
- Generated recipes baked: 100+/month
- ML model improves suggestion accept rate by 40%

### Privacy & Safety

- Environmental data (location): explicit permission
- Active session data: encrypted, auto-delete after 24h
- Generated recipes: nutritional info + allergen warnings
- ML model: user can opt-out of training data usage

**Estimated Effort**: 30+ hours (research + implementation)  
**Dependencies**: All prior versions, ML infrastructure, extensive user data

---

## Cross-Version Themes

### User Experience Principles

1. **Mobile-first**: All features must work on small screens
2. **Fast**: <3s response time for 95% of queries
3. **Transparent**: Show AI reasoning, not black box
4. **Forgiving**: Easy undo, clear error messages
5. **Delightful**: Micro-interactions, personality in AI tone

### Technical Principles

1. **Progressive enhancement**: Features degrade gracefully
2. **Offline-capable**: Core recipe editing works offline
3. **Type-safe**: TypeScript everywhere, Prisma for data
4. **Observable**: Logging, metrics, error tracking
5. **Tested**: Unit + integration tests for AI logic

### Metrics Dashboard

Track across all versions:

- **Engagement**: % users who try assistant, messages/week
- **Quality**: suggestion accept rate, feedback scores
- **Performance**: response time, error rate, uptime
- **Impact**: recipes improved by AI, user satisfaction

---

## Open Questions & Risks

### Technical Risks

- **AI cost**: Gemini API pricing may increase
  - Mitigation: Cache common responses, rate limits
- **Quality**: AI suggestions may be wrong/dangerous
  - Mitigation: Validation layer, user feedback loop
- **Latency**: Slow responses hurt UX
  - Mitigation: Streaming, optimistic UI, background analysis

### Product Risks

- **Adoption**: Users may not trust AI
  - Mitigation: Transparency, show reasoning, easy undo
- **Complexity**: Too many features overwhelm
  - Mitigation: Progressive disclosure, optional advanced features
- **Privacy**: Users concerned about data sharing
  - Mitigation: Clear opt-in, transparency, local-only mode

### Business Risks

- **API cost**: High usage = high Gemini API bills
  - Mitigation: Tiered access (free users = basic, premium = advanced)
- **Competition**: OpenAI or others launch recipe AI
  - Mitigation: Focus on integration with journaling (not standalone)
- **Maintenance**: AI features need ongoing tuning
  - Mitigation: Allocate 20% of dev time to AI improvements

---

## Success Criteria (Overall)

**By v1.1** (Q1 2026)

- 50% of active users try the assistant
- 70% of those have 3+ message conversations
- 4.2+ average rating (out of 5)

**By v2.0** (Q3 2026)

- 75% weekly active users use assistant
- 40% use voice or image features
- AI assists in 500+ recipe improvements/month

**By v3.0** (2027)

- AI assistant is core product differentiator
- 80% of new recipes involve AI collaboration
- Revenue from premium AI features: $5k+/month

---

## Resources

### Team Requirements

- **v1.0-v1.2**: 1 full-stack dev (current team)
- **v2.0**: +1 ML engineer (contractor OK)
- **v2.1-v3.0**: +1 ML engineer full-time, +1 data analyst

### Budget

- **v1.0-v1.2**: Gemini API only (~$50/month initially)
- **v2.0**: +Deepgram API (~$200/month)
- **v3.0**: +GPU instances (~$500/month), ML tooling

### Timeline

- **v1.0**: 2 weeks (current sprint)
- **v1.1**: 1 week
- **v1.2**: 1.5 weeks
- **v2.0**: 3 weeks (includes research)
- **v2.1**: 2 weeks
- **v3.0**: 6+ weeks (research-heavy)

---

## Appendix: Alternative Approaches Considered

### Why Not OpenAI?

- **Pros**: GPT-4 may have better recipe knowledge
- **Cons**: Higher cost, already using Gemini for photo extraction
- **Decision**: Stay with Gemini for consistency, revisit in v2.1

### Why Not Open Source LLMs?

- **Pros**: No API cost, full control
- **Cons**: Hosting complexity, quality lower than Gemini
- **Decision**: Not worth trade-off for v1, consider for v3.0 custom model

### Why Not RAG (Retrieval-Augmented Generation)?

- **Pros**: Could reference baking textbooks, recipe database
- **Cons**: Complexity, need vector DB, content licensing
- **Decision**: Defer to v2.1 (external resources feature)

### Why Slide-Up Panel vs. Modal?

- **Tested**: Modal felt too intrusive, blocks recipe view
- **User feedback**: Mobile users want quick peek, not full commitment
- **Decision**: Slide-up panel for v1, revisit if desktop usage high
