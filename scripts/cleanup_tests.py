#!/usr/bin/env python3
"""
Script to identify and remove problematic tests that don't match the actual codebase.
"""

import os
import re

def analyze_test_file(file_path):
    """Analyze a test file and identify problematic tests."""
    with open(file_path, 'r') as f:
        content = f.read()
    
    problematic_tests = []
    
    # Check for tests that reference non-existent functions
    non_existent_functions = [
        'parse_cv_text_with_openai',
        'extract_text_from_file',
        'parse_cv_with_openai'
    ]
    
    for func in non_existent_functions:
        if func in content:
            problematic_tests.append(f"References non-existent function: {func}")
    
    # Check for tests that use non-existent model fields
    non_existent_fields = [
        'description=',
        'requirements=',
        'suggestions=',
        'optimized_data='
    ]
    
    for field in non_existent_fields:
        if field in content:
            problematic_tests.append(f"Uses non-existent field: {field}")
    
    # Check for tests that expect custom __str__ methods
    if '__str__' in content and 'test.*string_representation' in content:
        problematic_tests.append("Expects custom __str__ method")
    
    return problematic_tests

def main():
    """Main function to analyze all test files."""
    test_dir = "../backend/tests/unit"
    
    print("🔍 Analyzing test files for problematic tests...\n")
    
    total_problematic = 0
    
    for filename in os.listdir(test_dir):
        if filename.endswith('.py') and filename.startswith('test_'):
            file_path = os.path.join(test_dir, filename)
            problematic = analyze_test_file(file_path)
            
            if problematic:
                print(f"📄 {filename}:")
                for issue in problematic:
                    print(f"  ❌ {issue}")
                    total_problematic += 1
                print()
    
    print(f"📊 Found {total_problematic} problematic test issues across all files.")
    print("\n💡 Recommendation: Remove or rewrite these tests to match your actual codebase.")

if __name__ == "__main__":
    main()

