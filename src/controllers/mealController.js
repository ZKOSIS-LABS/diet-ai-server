import MealPlan from '../models/MealPlan.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generatePlan(req, res) {
  const { preferences, goals } = req.body;
  const userId = req.user?.id; // From JWT auth middleware

  // Basic Input Validation
  if (!userId) {
    // This should ideally be caught by auth middleware, but good to double check
    return res.status(401).json({ error: 'User not authenticated.' });
  }
  if (!preferences || typeof preferences !== 'object' || !preferences.diet) {
    return res.status(400).json({ error: 'Invalid or missing preferences data. "diet" is required.' });
  }
  if (!goals || typeof goals !== 'object' || !goals.objective || !goals.calories) {
    return res.status(400).json({ error: 'Invalid or missing goals data. "objective" and "calories" are required.' });
  }

  const prompt = `Create a 7-day ${preferences.diet} meal plan for ${goals.objective} under ${goals.calories} kcal/day. Respond ONLY with a valid JSON array. Each object in the array represents a single day and MUST have exactly two properties: 1. "dayOfWeek" (a string, e.g., "Monday"). 2. "mealsDetails" (an array of strings, where each string is a detailed description of a specific meal for that day, like "Breakfast: Oatmeal with berries and nuts", "Lunch: Quinoa salad with chickpeas and mixed vegetables", "Dinner: Baked salmon with roasted asparagus"). Ensure the "mealsDetails" array is populated with at least 2-3 distinct meal strings for each day and is not empty. Do not include any other text or explanations outside of this JSON array.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview', // Consider gpt-3.5-turbo for cost/speed if acceptable
      messages: [
        { role: 'system', content: 'You are a helpful nutritionist assistant that provides meal plans in structured JSON format.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }, // Enforce JSON output if your model version supports it
    });

    let mealPlanContent;
    const messageContent = response.choices[0]?.message?.content;

    if (!messageContent) {
      throw new Error('Failed to get content from OpenAI response.');
    }

    console.log('Raw OpenAI messageContent BEFORE parsing:', messageContent);

    try {
      let parsedJson = JSON.parse(messageContent); 

      // Check if OpenAI returned an error object first
      if (parsedJson && parsedJson.error) {
        console.error('OpenAI returned an error:', parsedJson.error);
        // Return a 400 or 500 error to the client, indicating the AI couldn't fulfill the request
        return res.status(400).json({ error: 'Failed to generate meal plan due to input constraints.', details: parsedJson.error });
      }
      
      // Check if the parsed JSON is an object and has a property that is an array (e.g., "mealPlan" or "plan")
      // OpenAI with json_object mode might return {"mealPlan": [...]} or {"plan": [...]} or similar
      if (parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson)) {
        // Attempt to find the array within the object. Common keys might be 'plan', 'mealPlan', 'days', or the first array encountered.
        const keys = Object.keys(parsedJson);
        const arrayKey = keys.find(key => Array.isArray(parsedJson[key]));
        
        if (arrayKey) {
          console.warn(`OpenAI response was an object. Extracting array from key: "${arrayKey}".`);
          mealPlanContent = parsedJson[arrayKey];
        } else {
          // If no array is found as a direct property, it's an unexpected object structure.
          console.error('OpenAI response was an object, but no array property was found within it.', parsedJson);
          // This case should ideally be an error returned to the client, as the AI didn't provide the expected structure.
          throw new Error('AI response structure was an unexpected object without a meal plan array.');
        }
      } else if (Array.isArray(parsedJson)) {
        mealPlanContent = parsedJson; // It was an array directly
      } else {
        console.error('OpenAI response was not a JSON object or array after parsing.', parsedJson);
        throw new Error('AI response was not a parsable JSON object or array.');
      }

      if (!mealPlanContent || !Array.isArray(mealPlanContent) || mealPlanContent.some(day => !day.dayOfWeek || !Array.isArray(day.mealsDetails) || day.mealsDetails.length === 0)) {
        console.error('Parsed OpenAI response is not a valid array of day plans with populated mealsDetails:', mealPlanContent);
        // Fallback: create a plan indicating an issue, but still an array to match schema
        mealPlanContent = [{ 
          dayOfWeek: "Error", 
          mealsDetails: ["Failed to parse structured meal details from AI. Raw response: " + (messageContent ? messageContent.substring(0, 200) : "N/A") + "..."] 
        }];
        // Optionally, you could return a 500 error here instead of saving a fallback.
        // For now, we let it save the error state, but ideally, this should be an error response to the client.
        // Consider throwing an error here to be caught by the outer catch block for a more consistent error response.
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.log('messageContent that FAILED to parse as JSON:', messageContent);
      // If parsing fails, save the raw string content in a structured way (e.g. as a single element in the array)
      // This ensures it matches the 'Array' type in your MealPlan schema.
      mealPlanContent = [{ 
        dayOfWeek: "Parsing Error", 
        mealsDetails: ["Failed to parse AI response as JSON. Raw response: " + (messageContent ? messageContent.substring(0, 200) : "N/A") + "..."] 
      }];
    }

    const plan = await MealPlan.create({ user: userId, meals: mealPlanContent });
    res.status(201).json(plan);
  } catch (err) {
    console.error('Error in generatePlan:', err);
    // Check if the error is from the OpenAI client itself (e.g. APIError)
    if (err instanceof OpenAI.APIError) {
        console.error('OpenAI API Error Status:', err.status);
        console.error('OpenAI API Error Message:', err.message);
        console.error('OpenAI API Error Code:', err.code);
        console.error('OpenAI API Error Type:', err.type);
        return res.status(err.status || 500).json({ 
            error: 'Error from OpenAI API.', 
            details: {
                message: err.message,
                type: err.type,
                code: err.code
            }
        });
    }
    // Fallback for other types of errors
    res.status(500).json({ error: 'Failed to generate meal plan.', details: err.message });
  }
}
