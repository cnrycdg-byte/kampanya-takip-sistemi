-- Survey answers tablosunun yapısını kontrol et
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'survey_answers' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Survey answers tablosundaki örnek verileri göster
SELECT * FROM survey_answers LIMIT 5;

-- Survey questions tablosundaki question_type kolonunu kontrol et
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'survey_questions' 
AND table_schema = 'public'
ORDER BY ordinal_position;
