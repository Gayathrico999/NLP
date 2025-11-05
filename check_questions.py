from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/')
db = client['pollgen']

total = db.pollquestions.count_documents({})
print(f'\n📊 Total questions in database: {total}\n')

if total > 0:
    print('Latest 5 questions:')
    print('=' * 80)
    questions = list(db.pollquestions.find().sort('created_at', -1).limit(5))
    for i, q in enumerate(questions, 1):
        print(f"\n{i}. {q.get('question', 'N/A')}")
        print(f"   Difficulty: {q.get('difficulty', 'N/A')}")
        print(f"   Concept: {q.get('concept', 'N/A')}")
        print(f"   Created: {q.get('created_at', 'N/A')}")
else:
    print('⚠️  No questions found in database yet.')
    print('   Try speaking into the microphone to generate questions.')

