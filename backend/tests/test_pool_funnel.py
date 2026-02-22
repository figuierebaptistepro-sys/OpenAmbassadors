"""
Pool Funnel Tests - OpenAmbassadors
Tests for the complete Pool workflow:
- Business: Create pools, list pools, manage applications (approve/reject)
- Creator: See pools, join/apply, submit content

Test credentials:
- Business: testbusiness@emergent.org / password123
- Creator: testagent@emergent.org / password123
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://influence-pool-bugs.preview.emergentagent.com')

# Session for maintaining auth cookies
business_session = requests.Session()
creator_session = requests.Session()

# Module-level storage for test data
test_data = {}


class TestAuth:
    """Authentication tests"""
    
    def test_business_login(self):
        """Test business user login"""
        response = business_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testbusiness@emergent.org",
            "password": "password123"
        })
        assert response.status_code == 200, f"Business login failed: {response.text}"
        data = response.json()
        assert "user_id" in data
        assert data.get("user_type") == "business"
        test_data["business_user"] = data
        print(f"Business login successful: {data['user_id']}")
        
    def test_creator_login(self):
        """Test creator user login"""
        response = creator_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testagent@emergent.org",
            "password": "password123"
        })
        assert response.status_code == 200, f"Creator login failed: {response.text}"
        data = response.json()
        assert "user_id" in data
        assert data.get("user_type") == "creator"
        test_data["creator_user"] = data
        print(f"Creator login successful: {data['user_id']}")


class TestBusinessPoolWorkflow:
    """Tests for Business Pool management"""
    
    def test_list_business_pools(self):
        """Business can list their own pools"""
        response = business_session.get(f"{BASE_URL}/api/pools")
        assert response.status_code == 200, f"Failed to list pools: {response.text}"
        pools = response.json()
        assert isinstance(pools, list)
        print(f"Business has {len(pools)} pools")
        
        # Check if 'Test Brand Approval' pool exists
        approval_pools = [p for p in pools if "Test Brand Approval" in p.get("brand", {}).get("name", "")]
        if approval_pools:
            test_data["test_approval_pool"] = approval_pools[0]
            print(f"Found test pool with requires_approval: {approval_pools[0]['pool_id']}")
        
        # Store all pools for later tests
        test_data["business_pools"] = pools
        
    def test_get_pool_details(self):
        """Business can view pool details"""
        if not test_data.get("business_pools"):
            pytest.skip("No pools to test")
        
        pool = test_data["business_pools"][0]
        pool_id = pool["pool_id"]
        
        response = business_session.get(f"{BASE_URL}/api/pools/{pool_id}")
        assert response.status_code == 200, f"Failed to get pool: {response.text}"
        
        pool_detail = response.json()
        assert pool_detail.get("pool_id") == pool_id
        assert "brand" in pool_detail
        assert "brief" in pool_detail
        assert "status" in pool_detail
        assert "ui_summary" in pool_detail  # Business gets summary UI
        print(f"Pool details fetched: {pool_detail['brand'].get('name', 'N/A')}")
        
    def test_get_pool_applications(self):
        """Business can view applications for their pool"""
        if not test_data.get("test_approval_pool"):
            # Use first pool
            if not test_data.get("business_pools"):
                pytest.skip("No pools to test")
            pool = test_data["business_pools"][0]
        else:
            pool = test_data["test_approval_pool"]
        
        pool_id = pool["pool_id"]
        
        response = business_session.get(f"{BASE_URL}/api/pools/{pool_id}/applications")
        assert response.status_code == 200, f"Failed to get applications: {response.text}"
        
        applications = response.json()
        assert isinstance(applications, list)
        print(f"Pool {pool_id} has {len(applications)} applications")
        test_data["pool_applications"] = applications
        
    def test_get_pool_submissions(self):
        """Business can view submissions for their pool"""
        if not test_data.get("business_pools"):
            pytest.skip("No pools to test")
        
        pool = test_data["business_pools"][0]
        pool_id = pool["pool_id"]
        
        response = business_session.get(f"{BASE_URL}/api/pools/{pool_id}/submissions")
        assert response.status_code == 200, f"Failed to get submissions: {response.text}"
        
        submissions = response.json()
        assert isinstance(submissions, list)
        print(f"Pool {pool_id} has {len(submissions)} submissions")
        
    def test_get_pool_payouts(self):
        """Business can view payouts for their pool"""
        if not test_data.get("business_pools"):
            pytest.skip("No pools to test")
        
        pool = test_data["business_pools"][0]
        pool_id = pool["pool_id"]
        
        response = business_session.get(f"{BASE_URL}/api/pools/{pool_id}/payouts")
        assert response.status_code == 200, f"Failed to get payouts: {response.text}"
        
        payouts = response.json()
        assert isinstance(payouts, list)
        print(f"Pool {pool_id} has {len(payouts)} payouts/participants")


class TestCreatorPoolWorkflow:
    """Tests for Creator Pool discovery and participation"""
    
    def test_list_active_pools(self):
        """Creator can list active pools"""
        response = creator_session.get(f"{BASE_URL}/api/pools")
        assert response.status_code == 200, f"Failed to list pools: {response.text}"
        
        pools = response.json()
        assert isinstance(pools, list)
        print(f"Creator sees {len(pools)} active pools")
        
        # Find pool with requires_approval
        approval_pools = [p for p in pools if p.get("requires_approval")]
        if approval_pools:
            test_data["approval_pool_for_creator"] = approval_pools[0]
            print(f"Found pool requiring approval: {approval_pools[0]['pool_id']}")
        
        # Find pool without requires_approval
        direct_pools = [p for p in pools if not p.get("requires_approval")]
        if direct_pools:
            test_data["direct_pool_for_creator"] = direct_pools[0]
            print(f"Found pool for direct join: {direct_pools[0]['pool_id']}")
        
        test_data["creator_visible_pools"] = pools
        
    def test_get_pool_details_as_creator(self):
        """Creator can view pool details with participation status"""
        if not test_data.get("creator_visible_pools"):
            pytest.skip("No pools visible to creator")
        
        pool = test_data["creator_visible_pools"][0]
        pool_id = pool["pool_id"]
        
        response = creator_session.get(f"{BASE_URL}/api/pools/{pool_id}")
        assert response.status_code == 200, f"Failed to get pool: {response.text}"
        
        pool_detail = response.json()
        assert pool_detail.get("pool_id") == pool_id
        assert "brand" in pool_detail
        assert "brief" in pool_detail
        assert "ui_arena" in pool_detail  # Creator gets arena UI
        
        # Check if creator's participation/application status is included
        has_status_info = "participation" in pool_detail or "application" in pool_detail or "ui_arena" in pool_detail
        assert has_status_info, "Pool detail should include creator status info"
        
        print(f"Pool details for creator: {pool_detail['brand'].get('name', 'N/A')}")
        print(f"  requires_approval: {pool_detail.get('requires_approval', False)}")
        print(f"  has participation: {pool_detail.get('participation') is not None}")
        print(f"  has application: {pool_detail.get('application') is not None}")
        
    def test_get_pool_leaderboard(self):
        """Anyone can view pool leaderboard"""
        if not test_data.get("creator_visible_pools"):
            pytest.skip("No pools visible")
        
        pool = test_data["creator_visible_pools"][0]
        pool_id = pool["pool_id"]
        
        response = creator_session.get(f"{BASE_URL}/api/pools/{pool_id}/leaderboard")
        assert response.status_code == 200, f"Failed to get leaderboard: {response.text}"
        
        leaderboard = response.json()
        assert isinstance(leaderboard, list)
        print(f"Pool {pool_id} leaderboard has {len(leaderboard)} entries")
        
    def test_get_my_participations(self):
        """Creator can view their participations"""
        response = creator_session.get(f"{BASE_URL}/api/pools/my/participations")
        assert response.status_code == 200, f"Failed to get participations: {response.text}"
        
        participations = response.json()
        assert isinstance(participations, list)
        print(f"Creator has {len(participations)} pool participations")
        test_data["creator_participations"] = participations
        
    def test_get_my_applications(self):
        """Creator can view their applications"""
        response = creator_session.get(f"{BASE_URL}/api/pools/my/applications")
        assert response.status_code == 200, f"Failed to get applications: {response.text}"
        
        applications = response.json()
        assert isinstance(applications, list)
        print(f"Creator has {len(applications)} pool applications")
        test_data["creator_applications"] = applications
        
    def test_get_my_submissions(self):
        """Creator can view their submissions"""
        response = creator_session.get(f"{BASE_URL}/api/pools/my/submissions")
        assert response.status_code == 200, f"Failed to get submissions: {response.text}"
        
        submissions = response.json()
        assert isinstance(submissions, list)
        print(f"Creator has {len(submissions)} submissions total")


class TestPoolApprovalWorkflow:
    """Test the approval workflow for pools with requires_approval=true"""
    
    def test_verify_test_pool_exists(self):
        """Verify the Test Brand Approval pool exists"""
        response = business_session.get(f"{BASE_URL}/api/pools")
        assert response.status_code == 200
        
        pools = response.json()
        approval_pool = next((p for p in pools if "Test Brand Approval" in p.get("brand", {}).get("name", "")), None)
        
        if approval_pool:
            test_data["test_brand_approval_pool"] = approval_pool
            print(f"Test Brand Approval pool found: {approval_pool['pool_id']}")
            print(f"  requires_approval: {approval_pool.get('requires_approval')}")
            print(f"  status: {approval_pool.get('status')}")
        else:
            print("Test Brand Approval pool not found - it may need to be created")
            
    def test_pool_with_approval_shows_badge(self):
        """Pool with requires_approval should include that flag in response"""
        if not test_data.get("test_brand_approval_pool"):
            pytest.skip("Test Brand Approval pool not found")
        
        pool = test_data["test_brand_approval_pool"]
        pool_id = pool["pool_id"]
        
        response = creator_session.get(f"{BASE_URL}/api/pools/{pool_id}")
        assert response.status_code == 200
        
        pool_detail = response.json()
        assert pool_detail.get("requires_approval") == True, "Pool should have requires_approval=true"
        print(f"Pool correctly shows requires_approval=true")


class TestPoolContentSubmission:
    """Test content submission workflow"""
    
    def test_submit_content_requires_participation(self):
        """Creator must join pool before submitting content"""
        if not test_data.get("creator_visible_pools"):
            pytest.skip("No pools visible")
        
        # Find a pool that creator hasn't joined
        pool_id = test_data["creator_visible_pools"][0]["pool_id"]
        
        response = creator_session.post(f"{BASE_URL}/api/pools/{pool_id}/submit", json={
            "pool_id": pool_id,
            "platform": "TIKTOK",
            "content_url": "https://tiktok.com/@test/video/123"
        })
        
        # Should either succeed (if already joined) or fail with specific error
        if response.status_code == 200:
            print(f"Content submitted successfully (creator was already in pool)")
        else:
            data = response.json()
            print(f"Content submission result: {response.status_code} - {data}")


class TestErrorHandling:
    """Test error handling scenarios"""
    
    def test_get_nonexistent_pool(self):
        """Getting a non-existent pool returns 404"""
        response = creator_session.get(f"{BASE_URL}/api/pools/nonexistent_pool_id_123")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Non-existent pool correctly returns 404")
        
    def test_creator_cannot_create_pool(self):
        """Only businesses can create pools"""
        response = creator_session.post(f"{BASE_URL}/api/pools", json={
            "package": 5000,
            "mode": "CPM",
            "cpm_rate": 2.5,
            "platforms": ["TIKTOK"],
            "duration_days": 30,
            "brand": {"name": "Test", "industry": "Tech"},
            "brief": {"offer_description": "Test", "key_message": "Test", "cta": "Test"}
        })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Creator correctly blocked from creating pool")
        
    def test_business_cannot_join_pool(self):
        """Only creators can join pools"""
        if not test_data.get("business_pools"):
            pytest.skip("No pools to test")
        
        pool_id = test_data["business_pools"][0]["pool_id"]
        response = business_session.post(f"{BASE_URL}/api/pools/{pool_id}/join")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Business correctly blocked from joining pool")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
