import MealPlan from '../models/MealPlan.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generatePlan(req, res) {
  const { preferences, goals } = req.body;
  const userId = req.user?.id; // From JWT auth middleware

  // Basic Input Validation
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated.' });
  }
  if (!preferences || typeof preferences !== 'object' || !preferences.diet || !preferences.foodPreferences) {
    return res.status(400).json({ error: 'Invalid or missing preferences data. "diet" and "foodPreferences" are required.' });
  }
  if (!goals || typeof goals !== 'object' || !goals.objective) {
    return res.status(400).json({ error: 'Invalid or missing goals data. "objective" is required.' });
  }

  const prompt = `Create a meal plan for one day (${preferences.diet}) for ${goals.objective}. The user prefers the following types of food: ${preferences.foodPreferences}. Respond ONLY with a valid JSON object. The object MUST have exactly two properties: 
  1. "dayOfWeek" (a string, e.g., "Monday"). 
  2. "mealsDetails" (an object with three properties: "breakfast", "lunch", and "supper", where each property is a string describing the meal, e.g., "Breakfast: Oatmeal with berries and nuts"). 
  Do not include any other text, explanations, or formatting outside of this JSON object.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are a helpful nutritionist assistant that provides meal plans in structured JSON format.' },
        { role: 'user', content: prompt }
      ]
    });

    const messageContent = response.choices[0]?.message?.content;

    if (!messageContent) {
      throw new Error('Failed to get content from OpenAI response.');
    }

    // Sanitize the response to remove unexpected characters
    const sanitizedContent = messageContent.trim();

    let mealPlanContent;
    try {
      mealPlanContent = JSON.parse(sanitizedContent);

      // Validate the structure of the parsed JSON
      if (
        !mealPlanContent.dayOfWeek ||
        !mealPlanContent.mealsDetails ||
        !mealPlanContent.mealsDetails.breakfast ||
        !mealPlanContent.mealsDetails.lunch ||
        !mealPlanContent.mealsDetails.supper
      ) {
        throw new Error('Invalid meal plan structure.');
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      mealPlanContent = {
        dayOfWeek: "Error",
        mealsDetails: {
          breakfast: "Failed to parse structured meal details from AI.",
          lunch: "Failed to parse structured meal details from AI.",
          supper: "Failed to parse structured meal details from AI."
        }
      };
    }

    const plan = await MealPlan.create({ user: userId, meals: [mealPlanContent] });
    res.status(201).json(plan);
  } catch (err) {
    console.error('Error in generatePlan:', err);
    res.status(500).json({ error: 'Failed to generate meal plan.', details: err.message });
  }
}
