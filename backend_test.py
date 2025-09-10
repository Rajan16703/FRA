import requests
import sys
import json
from datetime import datetime

class FRAConnectAPITester:
    def __init__(self, base_url="https://rightsatlas.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.village_id = None
        self.claim_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else self.api_url
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(response_data) <= 3:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, list) and len(response_data) > 0:
                        print(f"   Response: {len(response_data)} items returned")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_analytics(self):
        """Test analytics endpoint"""
        return self.run_test("Analytics Endpoint", "GET", "analytics", 200)

    def test_villages_list(self):
        """Test villages list endpoint"""
        success, data = self.run_test("Villages List", "GET", "villages", 200)
        if success and isinstance(data, list) and len(data) > 0:
            self.village_id = data[0].get('id')
            print(f"   Stored village_id: {self.village_id}")
        return success

    def test_villages_with_filters(self):
        """Test villages with state filter"""
        params = {"state": "Madhya Pradesh", "limit": 10}
        return self.run_test("Villages with State Filter", "GET", "villages", 200, params=params)

    def test_village_by_id(self):
        """Test get specific village by ID"""
        if not self.village_id:
            print("❌ Skipped - No village_id available")
            return False
        return self.run_test("Get Village by ID", "GET", f"villages/{self.village_id}", 200)

    def test_claims_list(self):
        """Test claims list endpoint"""
        success, data = self.run_test("Claims List", "GET", "claims", 200)
        if success and isinstance(data, list) and len(data) > 0:
            self.claim_id = data[0].get('id')
            print(f"   Stored claim_id: {self.claim_id}")
        return success

    def test_claims_with_filters(self):
        """Test claims with status filter"""
        params = {"status": "pending", "limit": 10}
        return self.run_test("Claims with Status Filter", "GET", "claims", 200, params=params)

    def test_claim_by_id(self):
        """Test get specific claim by ID"""
        if not self.claim_id:
            print("❌ Skipped - No claim_id available")
            return False
        return self.run_test("Get Claim by ID", "GET", f"claims/{self.claim_id}", 200)

    def test_update_claim(self):
        """Test update claim status"""
        if not self.claim_id:
            print("❌ Skipped - No claim_id available")
            return False
        
        update_data = {"status": "under_review"}
        return self.run_test("Update Claim Status", "PUT", f"claims/{self.claim_id}", 200, data=update_data)

    def test_mock_data_generation(self):
        """Test mock data generation"""
        return self.run_test("Generate Mock Data", "POST", "mock-data/generate", 200)

    def test_map_villages(self):
        """Test villages GeoJSON endpoint"""
        return self.run_test("Villages GeoJSON", "GET", "map/villages", 200)

    def test_map_claims(self):
        """Test claims GeoJSON endpoint"""
        return self.run_test("Claims GeoJSON", "GET", "map/claims", 200)

    def test_users_list(self):
        """Test users list endpoint"""
        return self.run_test("Users List", "GET", "users", 200)

    def test_create_village(self):
        """Test create new village"""
        village_data = {
            "name": f"Test Village {datetime.now().strftime('%H%M%S')}",
            "state": "Test State",
            "district": "Test District", 
            "tehsil": "Test Tehsil",
            "coordinates": {"lat": 23.0, "lng": 80.0},
            "total_forest_area": 100.5
        }
        return self.run_test("Create Village", "POST", "villages", 200, data=village_data)

    def test_create_claim(self):
        """Test create new claim"""
        if not self.village_id:
            print("❌ Skipped - No village_id available for claim creation")
            return False
            
        claim_data = {
            "beneficiary_name": f"Test Beneficiary {datetime.now().strftime('%H%M%S')}",
            "village_id": self.village_id,
            "claim_type": "Individual Forest Rights",
            "area_claimed": 2.5,
            "survey_numbers": ["Test/1", "Test/2"]
        }
        return self.run_test("Create Claim", "POST", "claims", 200, data=claim_data)

def main():
    print("🌲 FRA-Connect API Testing Suite")
    print("=" * 50)
    
    tester = FRAConnectAPITester()
    
    # Test sequence
    test_methods = [
        tester.test_root_endpoint,
        tester.test_mock_data_generation,  # Generate data first
        tester.test_analytics,
        tester.test_villages_list,
        tester.test_villages_with_filters,
        tester.test_village_by_id,
        tester.test_claims_list,
        tester.test_claims_with_filters,
        tester.test_claim_by_id,
        tester.test_update_claim,
        tester.test_map_villages,
        tester.test_map_claims,
        tester.test_users_list,
        tester.test_create_village,
        tester.test_create_claim
    ]
    
    print(f"\n🚀 Running {len(test_methods)} API tests...")
    
    for test_method in test_methods:
        try:
            test_method()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())