import { NextResponse, type NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getProfile } from '@/lib/auth'
import { isStaff } from '@/lib/types'
import { specSheet, TAXONOMY } from '@/lib/catalog'

export const maxDuration = 300

/**
 * Researches a bottle and returns a draft catalog entry for a manager to edit.
 *
 * Given a name, a barcode, or both, Claude searches the web for the producer's
 * own material and reputable references, then fills in the technical spec sheet
 * for that category. Nothing is written to the database here — the manager
 * reviews the draft in the admin panel and saves it themselves.
 */

const CATEGORY_LIST = TAXONOMY.map((t) =>
  t.subcategories?.length
    ? `${t.category} (${t.subcategories.join(', ')})`
    : t.category
).join('; ')

export async function POST(request: NextRequest) {
  const profile = await getProfile()
  if (!profile || !isStaff(profile.role)) {
    return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured. Add it in Railway and redeploy.' },
      { status: 501 }
    )
  }

  const { name, barcode, hint } = (await request.json()) as {
    name?: string
    barcode?: string
    hint?: string
  }

  if (!name?.trim() && !barcode?.trim()) {
    return NextResponse.json(
      { error: 'Give us a bottle name or a barcode to look up.' },
      { status: 400 }
    )
  }

  const client = new Anthropic()

  // The schema mirrors catalog_items so the draft drops straight into the form.
  const schema = {
    type: 'object',
    properties: {
      found: {
        type: 'boolean',
        description: 'False if the bottle could not be confidently identified.',
      },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      name: { type: 'string', description: 'Full label name as the producer writes it.' },
      kind: { type: 'string', enum: ['spirit', 'beer', 'wine'] },
      category: { type: 'string' },
      subcategory: { type: 'string' },
      producer_name: { type: 'string' },
      producer_description: {
        type: 'string',
        description: 'Two or three sentences on the producer — history, method, what makes them notable.',
      },
      producer_country: { type: 'string' },
      producer_region: { type: 'string' },
      producer_founded_year: { type: 'integer' },
      producer_website: { type: 'string' },
      country: { type: 'string' },
      region: { type: 'string' },
      abv: { type: 'number' },
      age_statement: { type: 'string' },
      vintage: { type: 'integer' },
      description: {
        type: 'string',
        description:
          'Two or three sentences for the members list. What it is and why it is interesting. No marketing language.',
      },
      tasting_notes: {
        type: 'string',
        description: 'A single sentence of nose, palate, and finish.',
      },
      specs: {
        type: 'object',
        description:
          'Technical specifications keyed by the spec field names given in the prompt. Omit any you cannot verify.',
        additionalProperties: { type: 'string' },
      },
      image_urls: {
        type: 'array',
        items: { type: 'string' },
        description: 'Direct URLs to bottle images found during research, producer sites preferred.',
      },
      sources: {
        type: 'array',
        items: { type: 'string' },
        description: 'URLs used, so a manager can check the work.',
      },
      unverified: {
        type: 'array',
        items: { type: 'string' },
        description: 'Spec fields left blank because no reliable source was found.',
      },
    },
    required: ['found', 'confidence', 'name', 'category', 'description', 'specs', 'sources'],
    additionalProperties: false,
  } as const

  // Give Claude the exact spec vocabulary so keys line up with SPEC_SHEETS.
  const allSpecKeys = [
    ...new Set(
      TAXONOMY.flatMap((t) => [t.category, ...(t.subcategories ?? [])]).flatMap((c) =>
        specSheet(c).map((f) => `${f.key} (${f.label})`)
      )
    ),
  ].join(', ')

  const target = [
    name?.trim() && `Name on the label: ${name.trim()}`,
    barcode?.trim() && `Barcode / UPC: ${barcode.trim()}`,
    hint?.trim() && `Additional context from staff: ${hint.trim()}`,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'high',
        format: { type: 'json_schema', schema },
      },
      tools: [{ type: 'web_search_20260209', name: 'web_search' }],
      system: `You research bottles for the backbar list at Subourbon, a whisky and cocktail bar in Wheaton, Illinois. Managers scan a bottle and you produce a draft entry they will review before publishing.

Search the web for the producer's own material first, then reputable independent references. Accuracy matters far more than completeness: a manager can fill a gap, but a wrong ester count or a fabricated mash bill will end up in front of members who know better.

Rules:
- Only state a specification you found in a source. Never infer one from category norms, and never estimate.
- List every spec you could not verify in "unverified" rather than guessing.
- If you cannot confidently identify the bottle, set found to false and say so in description.
- Write for people who already know the category. No marketing copy, no superlatives.
- Choose category and subcategory from this taxonomy only: ${CATEGORY_LIST}

Use these spec keys where they apply: ${allSpecKeys}`,
      messages: [
        {
          role: 'user',
          content: `Research this bottle and draft a catalog entry.\n\n${target}`,
        },
      ],
    })

    if (response.stop_reason === 'refusal') {
      return NextResponse.json(
        { error: 'That lookup was declined. Enter the bottle by hand.' },
        { status: 422 }
      )
    }

    const text = response.content.find((b) => b.type === 'text')
    if (!text || text.type !== 'text') {
      return NextResponse.json({ error: 'No draft came back. Try again.' }, { status: 502 })
    }

    return NextResponse.json({
      draft: JSON.parse(text.text),
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    })
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: 'Rate limited by the research service. Wait a moment and try again.' },
        { status: 429 }
      )
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Research failed (${err.status}). Enter the bottle by hand.` },
        { status: 502 }
      )
    }
    return NextResponse.json({ error: 'Research failed unexpectedly.' }, { status: 500 })
  }
}
