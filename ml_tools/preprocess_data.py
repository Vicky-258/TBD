# ml_tools/preprocess_data.py
import pandas as pd
import numpy as np

def load_voyage_data(filepath):
    """
    Loads raw voyage data from a CSV file into a pandas DataFrame.
    
    Args:
        filepath (str): The path to the raw data CSV file.
        
    Returns:
        pd.DataFrame: A DataFrame containing the loaded data, or None on error.
    """
    try:
        df = pd.read_csv(filepath)
        print(f"Successfully loaded data from {filepath}. Shape: {df.shape}")
        return df
    except FileNotFoundError:
        print(f"Error: The file was not found at {filepath}")
        return None

def clean_data(df):
    """
    Cleans the raw voyage data. This includes handling missing values,
    correcting data types, and removing outliers.
    
    Args:
        df (pd.DataFrame): The raw data DataFrame.
        
    Returns:
        pd.DataFrame: The cleaned data DataFrame.
    """
    print("\n--- Starting Data Cleaning ---")
    
    # Drop rows with critical missing values (e.g., no fuel or distance)
    df.dropna(subset=['fuel_consumed_tonnes', 'distance_nm'], inplace=True)
    print(f"Shape after dropping critical NaNs: {df.shape}")
    
    # Impute missing numerical values with the median
    for col in ['avg_speed_knots', 'sea_state']:
        if col in df.columns:
            median_val = df[col].median()
            df[col].fillna(median_val, inplace=True)
            print(f"Filled missing values in '{col}' with median value ({median_val:.2f}).")

    # Remove unrealistic values (outliers)
    df = df[df['fuel_consumed_tonnes'] > 0]
    df = df[df['distance_nm'] > 10] # Remove very short, irrelevant trips
    df = df[(df['avg_speed_knots'] > 1) & (df['avg_speed_knots'] < 30)]
    print(f"Shape after removing outliers: {df.shape}")
    
    # Ensure correct data types
    df['ship_type'] = df['ship_type'].astype('category')
    
    print("--- Data Cleaning Complete ---")
    return df

def engineer_features(df):
    """
    Creates new, potentially useful features from the existing data.
    
    Args:
        df (pd.DataFrame): The cleaned data DataFrame.
        
    Returns:
        pd.DataFrame: The DataFrame with new engineered features.
    """
    print("\n--- Starting Feature Engineering ---")
    
    # Calculate fuel efficiency in tonnes per nautical mile
    # Add a small epsilon to avoid division by zero
    df['fuel_per_nm'] = df['fuel_consumed_tonnes'] / (df['distance_nm'] + 1e-6)
    
    # One-hot encode categorical variables like ship_type
    # This converts categories into a format suitable for ML models
    df = pd.get_dummies(df, columns=['ship_type'], prefix='ship')
    
    print("Created new features: 'fuel_per_nm' and one-hot encoded ship types.")
    print(f"Final shape after feature engineering: {df.shape}")
    print("--- Feature Engineering Complete ---")
    return df

def save_processed_data(df, output_path):
    """
    Saves the processed DataFrame to a new CSV file.
    
    Args:
        df (pd.DataFrame): The processed DataFrame.
        output_path (str): The path to save the new CSV file.
    """
    try:
        df.to_csv(output_path, index=False)
        print(f"\nProcessed data successfully saved to {output_path}")
    except IOError as e:
        print(f"Error saving data to {output_path}: {e}")

# --- Example Usage ---
if __name__ == '__main__':
    # In a real scenario, this file path would point to your raw data source.
    # Here, we create a dummy CSV in memory to demonstrate the process.
    from io import StringIO

    # Create a sample raw dataset as a string in CSV format
    raw_data = """voyage_id,ship_type,distance_nm,avg_speed_knots,sea_state,fuel_consumed_tonnes
1,Bulk Carrier,3500,14.5,3,580
2,Oil Tanker,4200,15.1,4,1300
3,Container Ship,5100,21.0,2,1150
4,Bulk Carrier,,14.0,5,610
5,Ro-Ro Cargo,1200,18.5,,230
6,Oil Tanker,4350,14.9,4,1350
7,Container Ship,4950,20.5,3,
8,Bulk Carrier,3200,13.8,2,550
9,Invalid Ship,5,50,1,50
"""
    
    input_filepath = StringIO(raw_data)
    output_filepath = 'processed_voyage_data.csv'
    
    # --- Run the preprocessing pipeline ---
    # 1. Load the data
    voyage_df = load_voyage_data(input_filepath)
    
    if voyage_df is not None:
        # Print initial data for comparison
        print("\nInitial Data Head:")
        print(voyage_df.head())
        print("\nInitial Data Info:")
        voyage_df.info()
        
        # 2. Clean the data
        cleaned_df = clean_data(voyage_df)
        
        # 3. Engineer features
        featured_df = engineer_features(cleaned_df)
        
        # 4. Save the result
        save_processed_data(featured_df, output_filepath)
        
        print("\nFinal Processed Data Head:")
        print(featured_df.head())
